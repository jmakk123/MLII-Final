"""Dual-stream fusion model (brief §8.7) + cross-attention ablation.

Architectures
-------------
- FusionModel                 : standard concat-fusion (brief §8.7).
- CrossAttentionFusionModel   : single attention head with the LSTM hidden
                                states (5 timesteps) as keys/values and the
                                price embedding as query, then the same
                                fusion head. Maps to Week 7 attention
                                coverage; addresses the TA fusion-mechanism
                                ablation priority.
- FinancialsOnlyModel         : drop the price branch entirely (ablation).
- PriceOnlyModel              : drop the financial branch entirely (ablation).

All models accept `(x_fin (B, 5, 18), x_price (B, 7))` and return a scalar
prediction `(B,)`. They also expose `embed(x_fin, x_price) -> (B, embed_dim)`
returning the pre-head representation so the training loop can attach an
auxiliary BCE head for the multi-task tuned variant.
"""

from __future__ import annotations

import torch
import torch.nn as nn

from src.temporal.encoder import LSTMEncoder, MLPFlattenEncoder, PriceMLP

FIN_OUT = 32
PRICE_OUT = 16
FUSION_IN = FIN_OUT + PRICE_OUT     # 48


def _make_head(in_dim: int, hidden: int = 32, dropout: float = 0.2) -> nn.Sequential:
    """Fusion head: LayerNorm + 2-layer MLP -> scalar (brief §8.7)."""
    return nn.Sequential(
        nn.LayerNorm(in_dim),
        nn.Linear(in_dim, hidden),
        nn.ReLU(),
        nn.Dropout(dropout),
        nn.Linear(hidden, hidden),
        nn.ReLU(),
        nn.Dropout(dropout),
        nn.Linear(hidden, 1),
    )


class FusionModel(nn.Module):
    """Concat-fusion of financial + price branches (brief §8.7)."""

    def __init__(self, fin_encoder: str = "lstm", dropout: float = 0.2):
        super().__init__()
        if fin_encoder == "lstm":
            self.fin = LSTMEncoder(dropout=dropout)
        elif fin_encoder == "mlp":
            self.fin = MLPFlattenEncoder(dropout=dropout)
        else:
            raise ValueError(f"fin_encoder must be 'lstm' or 'mlp', got {fin_encoder}")
        self.price = PriceMLP(dropout=dropout)
        self.head = _make_head(FUSION_IN, dropout=dropout)
        self.embed_dim = FUSION_IN

    def embed(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        h_fin = self.fin(x_fin)                # (B, 32)
        h_price = self.price(x_price)          # (B, 16)
        return torch.cat([h_fin, h_price], dim=1)  # (B, 48)

    def forward(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.head(self.embed(x_fin, x_price)).squeeze(-1)


class CrossAttentionFusionModel(nn.Module):
    """Cross-attention between LSTM hidden states and the price embedding.

    Price embedding -> Q (broadcast to 1 token), LSTM hidden states -> K,V
    (5 tokens). One attention head, then concat the attention output with
    the price embedding and feed the standard head.
    """

    def __init__(self, d_attn: int = 32, dropout: float = 0.2):
        super().__init__()
        self.fin = LSTMEncoder(dropout=dropout)
        self.price = PriceMLP(dropout=dropout)
        self.k_proj = nn.Linear(self.fin.lstm.hidden_size, d_attn)
        self.v_proj = nn.Linear(self.fin.lstm.hidden_size, d_attn)
        self.q_proj = nn.Linear(PRICE_OUT, d_attn)
        self.attn = nn.MultiheadAttention(d_attn, num_heads=1, dropout=dropout, batch_first=True)
        self.embed_dim = d_attn + PRICE_OUT
        self.head = _make_head(self.embed_dim, dropout=dropout)

    def embed(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        _, full = self.fin.forward_with_states(x_fin)     # (B, 5, 64)
        h_price = self.price(x_price)                     # (B, 16)
        K = self.k_proj(full)                             # (B, 5, d_attn)
        V = self.v_proj(full)                             # (B, 5, d_attn)
        Q = self.q_proj(h_price).unsqueeze(1)             # (B, 1, d_attn)
        attn_out, _ = self.attn(Q, K, V)                  # (B, 1, d_attn)
        pooled = attn_out.squeeze(1)                      # (B, d_attn)
        return torch.cat([pooled, h_price], dim=1)        # (B, d_attn + 16)

    def forward(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.head(self.embed(x_fin, x_price)).squeeze(-1)


class FinancialsOnlyModel(nn.Module):
    """Drop the price branch entirely (ablation, brief §8.8)."""

    def __init__(self, fin_encoder: str = "lstm", dropout: float = 0.2):
        super().__init__()
        self.fin = LSTMEncoder(dropout=dropout) if fin_encoder == "lstm" else MLPFlattenEncoder(dropout=dropout)
        self.embed_dim = FIN_OUT
        self.head = _make_head(self.embed_dim, dropout=dropout)

    def embed(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.fin(x_fin)

    def forward(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.head(self.embed(x_fin, x_price)).squeeze(-1)


class PriceOnlyModel(nn.Module):
    """Drop the financial branch entirely (ablation, brief §8.8)."""

    def __init__(self, dropout: float = 0.2):
        super().__init__()
        self.price = PriceMLP(dropout=dropout)
        self.embed_dim = PRICE_OUT
        self.head = _make_head(self.embed_dim, dropout=dropout)

    def embed(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.price(x_price)

    def forward(self, x_fin: torch.Tensor, x_price: torch.Tensor) -> torch.Tensor:
        return self.head(self.embed(x_fin, x_price)).squeeze(-1)


def build_model(config: str, dropout: float = 0.2) -> nn.Module:
    """Factory used by the training loop and the notebook ablation table.

    Configs:
      - 'lstm_fusion'       : full fusion, LSTM financial encoder (default headline)
      - 'mlp_fusion'        : full fusion, MLP-flatten financial encoder
      - 'fin_only'          : financials-only (LSTM)
      - 'price_only'        : price-only
      - 'cross_attn_fusion' : cross-attention variant (Week 7 / TA priority)
    """
    if config == "lstm_fusion":
        return FusionModel(fin_encoder="lstm", dropout=dropout)
    if config == "mlp_fusion":
        return FusionModel(fin_encoder="mlp", dropout=dropout)
    if config == "fin_only":
        return FinancialsOnlyModel(fin_encoder="lstm", dropout=dropout)
    if config == "price_only":
        return PriceOnlyModel(dropout=dropout)
    if config == "cross_attn_fusion":
        return CrossAttentionFusionModel(dropout=dropout)
    raise ValueError(f"Unknown config: {config}")


CONFIG_NAMES = [
    "lstm_fusion",
    "mlp_fusion",
    "fin_only",
    "price_only",
    "cross_attn_fusion",
]
