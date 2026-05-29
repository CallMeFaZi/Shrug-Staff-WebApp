# Client-Side Face Recognition with face-api.js

## Current Problem
Server-side face recognition requires heavy ML libraries (TensorFlow/DeepFace) that are difficult to build on Windows and add ~1GB to the Docker image. MediaPipe landmarks are inaccurate.

## Proposed Solution
Move all face detection + recognition to the **browser** using `@vladmandic/face-api`.

| Aspect | Current (Server-side) | Proposed (Client-side) |
|--------|----------------------|------------------------|
| Library | DeepFace (Python) | face-api.js (browser) |
| Where | Backend server | User's browser |
| Face encoding | 128-dim vector | 128-dim vector (same format) |
| Anti-spoofing | None | ✅ Blink detection |
| Registration | Upload photo → server processes | Camera capture → browser processes |
| Recognition | Upload photo → server matches | Camera → browser matches |
| Backend load | High (runs ML model) | Low (only stores/serves vectors) |
| Docker image | ~1.5GB | Stays ~200MB |
| Windows compatibility | ❌ Broken | ✅ Works natively |

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (face-api.js)                  │
│                                                          │
│  1. Start camera                                         │
│  2. Detect face with SSD Mobilenet v1                    │
│  3. Extract 128-dim descriptor (FaceNet)                  │
│  4. Blink detection (EAR formula via landmarks)           │
│  5. Send descriptor to backend for matching              │
│                                                          │
│  Registration flow:                                      │
│  1. Capture face → extract descriptor                    │
│  2. POST /api/admin/employees/:id/face-descriptor        │
│     (no image upload needed)                             │
│                                                          │
│  Attendance flow:                                        │
│  1. Detect face → blink detected? → extract descriptor   │
│  2. POST /api/recognize-descriptor { descriptor }        │
│  3. Backend compares, returns employee match             │
└──────────────────────────┬───────────────────────────────┘
                           │ HTTP (small JSON payloads only)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                        │
│                                                          │
│  POST /api/recognize-descriptor                          │
│    → Compare against stored encodings                    │
│    → Return best match                                   │
│                                                          │
│  POST /api/admin/employees/:id/face-descriptor           │
│    → Store 128-dim vector (no image)                     │
│    → Client handles image/camera                         │
└──────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Frontend Changes

| File | Change |
|------|--------|
| `frontend/package.json` | Add `@vladmandic/face-api` dependency |
| `frontend/src/hooks/useFaceDetection.ts` | **New** — Hook to init face-api, detect, extract descriptor |
| `frontend/src/hooks/useBlinkDetection.ts` | **New** — Hook for blink detection via EAR landmarks |
| `frontend/src/pages/AttendancePage.tsx` | Use face-api instead of image upload |
| `frontend/src/pages/admin/EmployeesPage.tsx` | Face registration uses live camera + face-api |
| `frontend/src/api/client.ts` | Add `recognizeDescriptor` and `registerDescriptor` endpoints |

### Backend Changes

| File | Change |
|------|--------|
| `backend/app/routers/recognition.py` | Add `POST /api/recognize-descriptor` endpoint |
| `backend/app/routers/employees.py` | Add `POST /api/admin/employees/:id/face-descriptor` endpoint |
| `backend/app/services/face_recognition.py` | Keep `compare_faces()` and `find_best_match()`, remove `encode_face()` |
| `backend/requirements-docker.txt` | Remove deepface/tensorflow (huge savings!) |

### Blink Detection
```javascript
// EAR (Eye Aspect Ratio) formula
// Left eye landmarks: [33, 160, 158, 133, 153, 144]
// Right eye landmarks: [362, 385, 387, 263, 373, 380]

function calculateEAR(eye) {
  const a = dist(eye[1], eye[5]);  // vertical
  const b = dist(eye[2], eye[4]);  // vertical
  const c = dist(eye[0], eye[3]);  // horizontal
  return (a + b) / (2.0 * c);
}

// Blink = EAR drops below threshold then rises back
```

## Files to Modify

| Step | File | Action |
|------|------|--------|
| 1 | `frontend/package.json` | Add `@vladmandic/face-api` |
| 2 | `frontend/src/hooks/useFaceDetection.ts` | Create |
| 3 | `frontend/src/hooks/useBlinkDetection.ts` | Create |
| 4 | `frontend/src/pages/AttendancePage.tsx` | Rewrite |
| 5 | `frontend/src/pages/admin/EmployeesPage.tsx` | Rewrite face modal |
| 6 | `frontend/src/api/client.ts` | Add new endpoints |
| 7 | `backend/app/routers/recognition.py` | Add descriptor endpoint |
| 8 | `backend/app/routers/employees.py` | Add descriptor registration |
| 9 | `backend/requirements-docker.txt` | Remove deepface/tensorflow |
| 10 | `backend/Dockerfile` | Simplify (remove libgl/opencv deps) |

## Why This Is Better

1. **No server ML dependencies** — backend stays lightweight (~200MB vs ~1.5GB)
2. **Blink detection** — anti-spoofing works in browser
3. **Works on Windows** — no C++ build tools needed
4. **Faster** — browser uses GPU/WebGL, near-instant detection
5. **Privacy** — images never leave the browser, only descriptors (which can't be reversed to an image)
6. **Offline-capable** — face-api models cached in browser