let currentQuestion = 0;
let questions = [];
let selectedLanguage = 'en';

async function startInteraction() {
  selectedLanguage = document.getElementById('languageSelect').value;
  const res = await fetch('/questions');
  questions = await res.json();
  askNextQuestion();
}

async function askNextQuestion() {
  if (currentQuestion >= questions.length) {
    document.getElementById('questionBox').innerHTML = "<strong>All questions completed!</strong>";
    document.getElementById('recorder').innerHTML = "";
    document.getElementById('statusText').textContent = "";

    // 👇 Show fetch answers section
    document.getElementById('answersSection').style.display = "block";
    return;
  }

  const q = questions[currentQuestion];
  document.getElementById('questionBox').innerHTML = `<p><strong>Q:</strong> ${q[`text_${selectedLanguage}`]}</p>`;

  const audio = new Audio(`/audio_questions/q${q.id}_${selectedLanguage}.mp3`);
  audio.play();

  audio.onended = () => {
    recordAnswer(q.id);
  };
}

function recordAnswer(questionId) {
  const recorderDiv = document.getElementById('recorder');
  const statusText = document.getElementById('statusText');
  recorderDiv.innerHTML = `
    <button id="startBtn">🎙️ Start Recording</button>
    <button id="stopBtn" disabled>🛑 Stop</button>
  `;
  statusText.textContent = "";

  let mediaRecorder;
  let audioChunks = [];

  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaRecorder = new MediaRecorder(stream);

      document.getElementById('startBtn').onclick = () => {
        mediaRecorder.start();
        audioChunks = [];
        document.getElementById('stopBtn').disabled = false;

        const startBtn = document.getElementById('startBtn');
        startBtn.textContent = "🔴 Recording…";
        startBtn.style.backgroundColor = "red";
        statusText.textContent = "🎙️ Recording in progress...";
      };

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      document.getElementById('stopBtn').onclick = () => {
        mediaRecorder.stop();
        statusText.textContent = "⏹️ Stopped. Uploading...";
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, `answer_q${questionId}.webm`);
        formData.append('question_id', questionId);
        formData.append('language', selectedLanguage);

        const response = await fetch('/upload/', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          recorderDiv.innerHTML = `<p>✅ Answer saved.</p>`;
          statusText.textContent = "";
          currentQuestion += 1;
          setTimeout(askNextQuestion, 1500);
        } else {
          recorderDiv.innerHTML = `<p>❌ Error saving answer.</p>`;
          statusText.textContent = "";
        }
      };
    });
}

// ✅ Fetch and display answers from the server
async function fetchAnswers() {
  const res = await fetch("/answers");
  // const res = await fetch('/responses');
  const data = await res.json(); // should return array of { question_id, text }

  const answersBox = document.getElementById('answersBox');
  answersBox.innerHTML = "<h3>📝 Your Answers:</h3>";

  for (const entry of data) {
    const q = questions.find(q => q.id === entry.question_id);
    if (q) {
      const questionText = q[`text_${selectedLanguage}`];
      const answerText = entry.text;
      answersBox.innerHTML += `
        <div style="margin-bottom: 15px;">
          <p><strong>Q:</strong> ${questionText}</p>
          <p><strong>A:</strong> ${answerText}</p>
        </div>
      `;
    }
  }
}
