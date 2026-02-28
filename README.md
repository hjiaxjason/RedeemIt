# RedeemIt

A platform for managing and redeeming vouchers and rewards.

## Project Structure

```
RedeemIt/
├── backend/                    # FastAPI backend
│   ├── api/
│   │   ├── routes/            # API endpoints
│   │   ├── schemas/           # Pydantic models
│   │   └── models/            # Database models
│   ├── database/              # Database configuration
│   ├── main.py               # FastAPI app entry point
│   └── config.py             # Configuration settings
├── frontend/
│   └── website/              # React frontend
│       ├── src/              # Source files
│       └── public/           # Static assets
└── requirements.txt          # Python dependencies
```

## Getting Started

### Backend Setup
```bash
cd backend
pip install -r ../requirements.txt
python main.py
```

### Frontend Setup
```bash
cd frontend/website
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and configure as needed.
