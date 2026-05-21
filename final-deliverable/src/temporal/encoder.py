"""Financial-branch encoders (brief §8.7).

Two candidates, picked by val MAE per brief §8.7 / methodology §4:

- LSTMEncoder           : 2 layers, hidden 64, take final hidden state,
                          project to 32 dims via a linear head.
- MLPFlattenEncoder     : flatten (5,18) -> 90, 2-layer MLP [128, 64] -> 32.

Both accept input shape (batch, 5, 18) and return (batch, 32).
"""

from __future__ import annotations

import torch
import torch.nn as nn

FIN_OUT_DIM = 32     # brief §8.7: financial-branch output dim


class LSTMEncoder(nn.Module):
    """2-layer LSTM over (5, 18), project final hidden to FIN_OUT_DIM (brief §8.7).

    Exposes `forward_with_states(x)` so the cross-attention fusion variant can
    use the full sequence of hidden states as keys/values.
    """

    def __init__(self, input_dim: int = 18, hidden_dim: int = 64,
                 num_layers: int = 2, out_dim: int = FIN_OUT_DIM,
                 dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0,
        )
        self.proj = nn.Sequential(
            nn.Linear(hidden_dim, out_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:           # (B, 5, 18) -> (B, 32)
        out, (h, _) = self.lstm(x)
        last = out[:, -1, :]                                      # (B, hidden)
        return self.proj(last)

    def forward_with_states(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Returns (projected_last_hidden (B, out_dim), full_hidden_states (B, 5, hidden))."""
        out, _ = self.lstm(x)
        return self.proj(out[:, -1, :]), out


class MLPFlattenEncoder(nn.Module):
    """Flatten (5, 18) to 90 dims and run a 2-layer MLP -> FIN_OUT_DIM (brief §8.7)."""

    def __init__(self, input_dim: int = 5 * 18, hidden_dims: tuple[int, int] = (128, 64),
                 out_dim: int = FIN_OUT_DIM, dropout: float = 0.2):
        super().__init__()
        h1, h2 = hidden_dims
        self.net = nn.Sequential(
            nn.Linear(input_dim, h1),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(h1, h2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(h2, out_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:           # (B, 5, 18) -> (B, 32)
        B = x.shape[0]
        return self.net(x.reshape(B, -1))


class PriceMLP(nn.Module):
    """Price-branch 2-layer MLP, hidden 32, output 16 dims (brief §8.7)."""

    def __init__(self, input_dim: int = 7, hidden_dim: int = 32, out_dim: int = 16,
                 dropout: float = 0.2):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_dim, out_dim),
            nn.ReLU(),
            nn.Dropout(dropout),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:           # (B, 7) -> (B, 16)
        return self.net(x)
