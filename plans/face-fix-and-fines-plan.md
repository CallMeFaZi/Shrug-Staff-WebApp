# SHRUG STAFF — Face Recognition Fix & Fines/Bonuses System

## 1. Face Recognition Accuracy Fix

### Problem
Current system uses **MediaPipe FaceMesh landmarks** (468 geometric points x,y,z) for face encoding. This is **geometric landmark detection**, not actual facial feature extraction. Two different faces can have similar landmark ratios, leading to false matches.

### Solution: DeepFace (works in Docker/Linux)
Switch from MediaPipe landmark encoding to **DeepFace with Facenet model** inside the Docker container. DeepFace extracts a proper 128-dimensional facial feature embedding that's robust to different faces.

| Aspect | Current (Broken) | Fixed |
|--------|-----------------|-------|
| Library | MediaPipe FaceMesh | DeepFace + Facenet |
| Method | 1404 geometric coords | 128-dim facial embedding |
| Accuracy | Poor (99% false match) | High (industry standard) |
| Docker/Linux | Works | **Works perfectly** |
| Windows local | Works | ❌ Needs TensorFlow |

**Deployment strategy:**
- The `requirements.txt` was already updated to remove deepface (because of Windows issues)
- We add deepface back **only for Docker** using a separate `requirements-docker.txt`
- Or better: use a conditional import — try deepface, fall back to MediaPipe

### Implementation Plan

**Backend changes:**

1. [`backend/requirements-docker.txt`](backend/requirements-docker.txt) (new) — with deepface + tensorflow for Docker builds
2. [`backend/Dockerfile`](backend/Dockerfile) — use `requirements-docker.txt` instead
3. [`backend/app/services/face_recognition.py`](backend/app/services/face_recognition.py) — try DeepFace first, fall back to MediaPipe:

```python
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False

def encode_face(image_bytes):
    if DEEPFACE_AVAILABLE:
        # Use DeepFace Facenet embedding (128-dim, highly accurate)
        embedding = DeepFace.represent(img, model_name="Facenet", detector_backend="opencv")
        return embedding
    else:
        # Fall back to MediaPipe landmarks (less accurate)
        ...
```

### Files to change
| File | Change |
|------|--------|
| `backend/requirements-docker.txt` | New — deepface, tensorflow, tf-keras |
| `backend/Dockerfile` | Use requirements-docker.txt |
| `backend/app/services/face_recognition.py` | Add DeepFace support with MediaPipe fallback |
| `backend/app/config.py` | Option to configure backend |

---

## 2. Fines & Bonuses System

### New Database Table: `employee_adjustments`

```sql
CREATE TABLE employee_adjustments (
    id              SERIAL PRIMARY KEY,
    employee_id     INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    type            VARCHAR(10) NOT NULL,         -- 'fine' or 'bonus'
    amount          DECIMAL(12,2) NOT NULL,
    reason          TEXT NOT NULL,
    adjustment_date DATE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/adjustments` | Admin | List all (filters: employee_id, type, date range) |
| POST | `/api/admin/adjustments` | Admin | Create fine or bonus |
| DELETE | `/api/admin/adjustments/:id` | Admin | Delete an adjustment |

### Schema (Pydantic)

```python
class AdjustmentCreate(BaseModel):
    employee_id: int
    type: str  # 'fine' or 'bonus'
    amount: Decimal
    reason: str
    adjustment_date: date

class AdjustmentOut(BaseModel):
    id: int
    employee_id: int
    employee_name: Optional[str]
    type: str
    amount: Decimal
    reason: str
    adjustment_date: date
    created_at: datetime
```

### Payroll Integration
When generating payroll, the system will:
1. Sum all `fine` adjustments for the month → add to `deductions`
2. Sum all `bonus` adjustments for the month → add to `total_salary`
3. Updated formula: `final_salary = (total_salary + bonuses) - (deductions + fines)`

### Frontend: Fines Page (`/admin/adjustments`)

**New sidebar item**: `Adjustments` (💸 icon) between Payroll and Reports

**Page layout:**
```
┌─────────────────────────────────────────────┐
│  Adjustments                   [+ New]       │
├─────────────────────────────────────────────┤
│  Filters: [Employee dropdown] [Fine|Bonus|All] │
├─────────────────────────────────────────────┤
│  Date       │ Employee │ Type   │ Amount   │
│  28 May     │ Z        │ Fine   │ -500 PKR │
│  25 May     │ Z        │ Bonus  │ +200 PKR │
└─────────────────────────────────────────────┘
```

**New Adjustment Modal:**
```
┌─ New Adjustment ──────────────────────┐
│  Employee:     [Dropdown ▼]           │
│  Type:         [Fine] [Bonus]          │
│  Amount:       [________] PKR         │
│  Reason:       [________]             │
│  Date:         [____-__-__]           │
│                                        │
│           [Cancel] [Save]              │
└────────────────────────────────────────┘
```

### Files to create/modify

| File | Change |
|------|--------|
| `backend/app/models/adjustment.py` | New — SQLAlchemy model |
| `backend/app/models/__init__.py` | Add Adjustment |
| `backend/app/schemas/__init__.py` | Add AdjustmentCreate, AdjustmentOut |
| `backend/app/routers/adjustments.py` | New — CRUD endpoints |
| `backend/app/routers/__init__.py` | Register adjustments router |
| `backend/app/routers/payroll.py` | Integrate adjustments into payroll calc |
| `database/init.sql` | Add employee_adjustments table |
| `backend/app/main.py` | Import adjustments router |
| `frontend/src/types/index.ts` | Add Adjustment type |
| `frontend/src/api/client.ts` | Add adjustments API calls |
| `frontend/src/pages/admin/AdjustmentsPage.tsx` | New — UI page |
| `frontend/src/components/Layout/AdminLayout.tsx` | Add sidebar link |
| `frontend/src/App.tsx` | Add route |

---

## Implementation Order

### Phase 1 — Face Recognition Fix
1. Create `requirements-docker.txt` with deepface + tensorflow
2. Update Dockerfile to use it
3. Update `face_recognition.py` with DeepFace + MediaPipe fallback
4. Push to GitHub → deploy on Render → test accuracy

### Phase 2 — Fines & Bonuses
5. Create model + migration
6. Create API endpoints
7. Integrate with payroll
8. Build frontend page
9. Deploy