from fastapi import FastAPI, UploadFile, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import whisper
import shutil
import os
import json
from db import init_db, save_response, get_all_responses

app = FastAPI()
model = whisper.load_model("large")
init_db()

# Serve static files (HTML, JS)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/audio_questions", StaticFiles(directory="audio_questions"), name="audio")
os.makedirs("responses", exist_ok=True)


@app.get("/", response_class=HTMLResponse)
def serve_index():
    with open("static/index.html", encoding="utf-8") as f:
        return f.read()


@app.get("/questions")
def get_questions():
    with open("questions.json", encoding="utf-8") as f:
        return json.load(f)


@app.post("/upload/")
async def upload_audio(
    question_id: int = Form(...),
    file: UploadFile = Form(...),
    language: str = Form("en"),  # 🗣️ This comes from frontend selection
):
    filename = f"responses/response_q{question_id}.webm"
    with open(filename, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # 🟡 Debug Print: Show selected language
    print("Selected language:", language)

    # 🔍 Transcribe using selected language
    result = model.transcribe(filename, language=language, task="transcribe")
    # result = model.transcribe(filename, language=language)
    # 🟡 Debug Print: Show Whisper transcription
    transcription = result["text"]
    print("Transcription:", transcription)

    # 💾 Save transcription in original language (e.g. Hindi)
    save_response(question_id, filename, transcription)

    return {
        "message": "Upload successful",
        "file": filename,
        "transcription": transcription,
    }


@app.get("/answers")
def get_all_answers():
    with open("questions.json", encoding="utf-8") as f:
        questions = json.load(f)

    question_map = {q["id"]: q for q in questions}
    records = get_all_responses()

    # Match responses to questions
    answers = []
    for r in records:
        q_id, file, text, timestamp = r
        question = question_map.get(q_id, {})
        answers.append(
            {
                "question_id": q_id,
                "question_en": question.get("text_en", "Unknown"),
                "question_hi": question.get("text_hi", "Unknown"),
                "response": text,
                "timestamp": timestamp,
            }
        )

    return {"answers": answers}


# python -m uvicorn main:app --reload
