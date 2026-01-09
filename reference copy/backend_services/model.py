import torch
import torch.nn as nn

class RainfallPredictor(nn.Module):
    def __init__(self):
        super(RainfallPredictor, self).__init__()
        # Input features: Temperature, Humidity, Pressure, Cloud Cover
        self.fc1 = nn.Linear(4, 64)
        self.dropout1 = nn.Dropout(0.2)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(64, 32)
        self.dropout2 = nn.Dropout(0.2)
        self.fc3 = nn.Linear(32, 16)
        self.fc4 = nn.Linear(16, 1) # Output: Predicted Rainfall (mm)

    def forward(self, x):
        x = self.fc1(x)
        x = self.relu(x)
        x = self.dropout1(x)
        x = self.fc2(x)
        x = self.relu(x)
        x = self.dropout2(x)
        x = self.fc3(x)
        x = self.relu(x)
        x = self.fc4(x)
        return x
