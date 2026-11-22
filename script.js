const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const STORE = "pintarplay-v1";
let stats = loadStats();
let activeGame = null;
let questionIndex = 0;
let score = 0;
let answered = false;
let mathTimer = null;
let mathSeconds = 60;
let mathCorrect = 0;
let wordAnswer = "";
let wordPicked = [];

function loadStats(){
  try { return JSON.parse(localStorage.getItem(STORE)) || {xp:0, played:0, best:0, streak:0, lastDay:""}; }
  catch { return {xp:0, played:0, best:0, streak:0, lastDay:""}; }
}
function saveStats(){ localStorage.setItem(STORE, JSON.stringify(stats)); updateStats(); }
function updateStats(){
  $("#header-xp").textContent = stats.xp;
  $("#stat-xp").textContent = stats.xp;
  $("#stat-streak").textContent = stats.streak;
  $("#stat-played").textContent = stats.played;
  $("#stat-best").textContent = stats.best ? stats.best : "—";
}
function markPlayDay(){
  const today = new Date().toLocaleDateString("en-CA");
  if(stats.lastDay !== today){
    const yesterday = new Date(Date.now()-86400000).toLocaleDateString("en-CA");
    stats.streak = stats.lastDay === yesterday ? stats.streak + 1 : 1;
    stats.lastDay = today;
  }
}
updateStats();

const games = {
  trivia: {
    title:"Kuis Pengetahuan", subtitle:"Seberapa luas wawasanmu?", questions:[
      ["Apa ibu kota Australia?",["Sydney","Canberra","Melbourne","Perth"],1,"Canberra adalah ibu kota Australia, meskipun Sydney merupakan kota terbesarnya."],
      ["Planet terbesar di tata surya adalah ...",["Bumi","Saturnus","Jupiter","Neptunus"],2,"Jupiter adalah planet terbesar di tata surya kita."],
      ["Hewan mamalia terbesar di dunia adalah ...",["Gajah Afrika","Paus biru","Jerapah","Hiu paus"],1,"Paus biru dapat tumbuh lebih dari 25 meter."],
      ["Proklamasi Kemerdekaan Indonesia dibacakan pada ...",["1 Juni 1945","17 Agustus 1945","10 November 1945","20 Mei 1908"],1,"Proklamasi dibacakan pada 17 Agustus 1945 di Jakarta."],
      ["Zat hijau daun yang membantu fotosintesis disebut ...",["Hemoglobin","Klorofil","Melanin","Keratin"],1,"Klorofil menyerap energi cahaya untuk proses fotosintesis."],
      ["Samudra terluas di dunia adalah ...",["Atlantik","Hindia","Arktik","Pasifik"],3,"Samudra Pasifik mencakup area yang sangat luas di antara Asia, Australia, dan Amerika."],
      ["Bahasa pemrograman yang sering digunakan untuk membuat halaman web interaktif adalah ...",["JavaScript","SQL","Bash","C"],0,"JavaScript berjalan di browser dan membuat halaman web menjadi interaktif."],
      ["Organ tubuh yang memompa darah adalah ...",["Paru-paru","Hati","Jantung","Ginjal"],2,"Jantung memompa darah ke seluruh tubuh melalui pembuluh darah."],
      ["Candi Borobudur berada di provinsi ...",["Jawa Barat","Jawa Tengah","Jawa Timur","Bali"],1,"Borobudur berada di Kabupaten Magelang, Jawa Tengah."],
      ["Satuan dasar untuk mengukur kuat arus listrik adalah ...",["Volt","Watt","Ohm","Ampere"],3,"Ampere adalah satuan SI untuk kuat arus listrik."]
    ]
  },
  logic: {
    title:"Asah Logika", subtitle:"Temukan pola dan pecahkan teka-teki.", questions:[
      ["Lanjutkan pola: 2, 4, 8, 16, ...",["18","24","32","36"],2,"Setiap angka dikalikan 2, jadi 16 × 2 = 32."],
      ["Jika semua Bloop adalah Razz, dan semua Razz adalah Lazz, maka ...",["Semua Lazz adalah Bloops","Semua Bloops adalah Lazz","Tidak ada Bloops yang Lazz","Tidak bisa disimpulkan"],1,"Jika Bloop termasuk Razz dan Razz termasuk Lazz, Bloop juga termasuk Lazz."],
      ["Ada 5 apel. Kamu mengambil 2. Berapa apel yang kamu punya?",["2","3","5","7"],0,"Kamu mengambil 2 apel, jadi kamu punya 2 apel."],
      ["Mana yang berbeda dari kelompok ini?",["Segitiga","Persegi","Lingkaran","Kubus"],3,"Kubus adalah bangun ruang 3 dimensi, lainnya bangun datar."],
      ["Lanjutkan: Senin, Rabu, Jumat, ...",["Sabtu","Minggu","Selasa","Kamis"],1,"Pola melompat satu hari: Senin, Rabu, Jumat, Minggu."],
      ["Jika 3 mesin membuat 3 barang dalam 3 menit, 6 mesin membuat 6 barang dalam ...",["1 menit","3 menit","6 menit","9 menit"],1,"Setiap mesin membuat satu barang dalam 3 menit."],
      ["Angka mana yang tidak cocok: 4, 9, 16, 20, 25?",["4","9","20","25"],2,"Angka lainnya adalah kuadrat sempurna: 2², 3², 4², dan 5²."],
      ["Ayah Rina punya 5 anak: Nana, Nini, Nunu, Nene, dan ...",["Nono","Rina","Nunu","Nana"],1,"Nama Rina sudah disebutkan di awal pertanyaan."]
    ]
  }
};
const wordQuestions = [
  ["Alat untuk melihat benda yang sangat kecil","MIKROSKOP"],
  ["Tempat menyimpan dan meminjam buku","PERPUSTAKAAN"],
  ["Proses tumbuhan membuat makanan dengan cahaya","FOTOSINTESIS"],
  ["Benua tempat negara Indonesia berada","ASIA"],
  ["Alat untuk mengukur suhu","TERMOMETER"],
  ["Sumber energi utama bagi bumi","MATAHARI"],
  ["Kumpulan pulau yang membentuk satu wilayah","KEPULAUAN"],
  ["Ilmu yang mempelajari makhluk hidup","BIOLOGI"]
];

$$(".play-btn").forEach(btn => btn.addEventListener("click", () => startGame(btn.dataset.game)));
$("#close-game").addEventListener("click", closeGame);
$(".modal-backdrop").addEventListener("click", closeGame);
document.addEventListener("keydown", e => { if(e.key === "Escape") closeGame(); });

function openModal(){ $("#game-modal").classList.add("open"); $("#game-modal").setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
function closeGame(){ if(mathTimer) clearInterval(mathTimer); mathTimer=null; $("#game-modal").classList.remove("open"); $("#game-modal").setAttribute("aria-hidden","true"); document.body.style.overflow=""; }
function startGame(type){
  activeGame=type; questionIndex=0; score=0; answered=false;
  openModal();
  if(type==="math"){startMath();return;}
  if(type==="words"){renderWord();return;}
  renderQuestion();
}
function renderQuestion(){
  const game=games[activeGame], q=game.questions[questionIndex];
  const pct=(questionIndex/game.questions.length)*100;
  $("#game-content").innerHTML=`
    <div class="game-kicker">PINTARPLAY • ${activeGame==="trivia"?"PENGETAHUAN":"LOGIKA"}</div>
    <h2 class="game-title">${game.title}</h2><p class="game-sub">${game.subtitle}</p>
    <div class="question-count"><span>PERTANYAAN ${questionIndex+1} DARI ${game.questions.length}</span><span>✦ ${score*10} XP</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div class="question-text">${q[0]}</div>
    <div class="answers">${q[1].map((a,i)=>`<button class="answer-btn" data-answer="${i}">${String.fromCharCode(65+i)}. &nbsp;${a}</button>`).join("")}</div>
    <div class="feedback" id="feedback" aria-live="polite"></div>
    <button class="next-btn" id="next-question" disabled>${questionIndex===game.questions.length-1?"Lihat hasil":"Soal berikutnya"} →</button>`;
  $$(".answer-btn").forEach(b=>b.addEventListener("click",()=>chooseAnswer(Number(b.dataset.answer))));
  $("#next-question").addEventListener("click",()=>{questionIndex++; if(questionIndex>=game.questions.length) finishGame(score,game.questions.length); else renderQuestion();});
}
function chooseAnswer(choice){
  if(answered)return; answered=true;
  const q=games[activeGame].questions[questionIndex], correct=choice===q[2];
  if(correct)score++;
  $$(".answer-btn").forEach((b,i)=>{b.disabled=true;if(i===q[2])b.classList.add("correct");if(i===choice&&!correct)b.classList.add("wrong");});
  const fb=$("#feedback");fb.className="feedback "+(correct?"good":"bad");
  fb.textContent=(correct?"✓ Tepat! ":"Belum tepat. ")+q[3];
  $("#next-question").disabled=false;
}

function startMath(){
  mathSeconds=60;mathCorrect=0;score=0;
  renderMathQuestion();
  mathTimer=setInterval(()=>{
    mathSeconds--;
    const timer=$("#math-timer");if(timer)timer.textContent=mathSeconds+" detik";
    if(mathSeconds<=0){clearInterval(mathTimer);mathTimer=null;finishGame(mathCorrect,mathCorrect);}
  },1000);
}
function renderMathQuestion(){
  const a=Math.floor(Math.random()*20)+1,b=Math.floor(Math.random()*20)+1;
  const ops=["+","−","×"],op=ops[Math.floor(Math.random()*ops.length)];
  const answer=op==="+"?a+b:op==="−"?Math.abs(a-b):a*b;
  const left=op==="−"?Math.max(a,b):a,right=op==="−"?Math.min(a,b):b;
  $("#game-content").innerHTML=`
    <div class="game-kicker">PINTARPLAY • BERHITUNG</div><h2 class="game-title">Matematika Kilat</h2>
    <p class="game-sub">Jawab sebanyak mungkin dalam 60 detik. Setiap jawaban benar = 10 XP.</p>
    <div class="question-count"><span>JAWABAN BENAR: <b id="math-score">${mathCorrect}</b></span><span class="math-timer" id="math-timer">${mathSeconds} detik</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${(mathSeconds/60)*100}%"></div></div>
    <div class="math-question">${left} ${op} ${right} = ?</div>
    <form id="math-form"><input class="math-input" id="math-answer" type="number" inputmode="numeric" autocomplete="off" placeholder="Ketik jawabanmu" aria-label="Jawaban matematika"><button class="next-btn" type="submit">Periksa jawaban ↗</button></form>
    <div class="feedback" id="math-feedback" aria-live="polite"></div><div class="toast-note">Tekan Enter untuk mengirim jawaban.</div>`;
  $("#math-form").addEventListener("submit",e=>{
    e.preventDefault();const input=$("#math-answer");if(!input.value)return;
    const fb=$("#math-feedback");
    if(Number(input.value)===answer){mathCorrect++;fb.className="feedback good";fb.textContent="✓ Benar! Lanjutkan.";$("#math-score").textContent=mathCorrect;}
    else{fb.className="feedback bad";fb.textContent=`Belum tepat. Jawabannya ${answer}.`;}
    renderMathQuestion();
  });
  $("#math-answer").focus();
}
function renderWord(){
  const q=wordQuestions[questionIndex];wordAnswer=q[1];wordPicked=[];
  const letters=shuffle(wordAnswer.split(""));
  $("#game-content").innerHTML=`
    <div class="game-kicker">PINTARPLAY • KOSAKATA</div><h2 class="game-title">Tebak Kata</h2><p class="game-sub">Baca petunjuk, lalu susun huruf menjadi kata yang tepat.</p>
    <div class="question-count"><span>TANTANGAN ${questionIndex+1} DARI ${wordQuestions.length}</span><span>✦ ${score*10} XP</span></div>
    <div class="progress-track"><div class="progress-fill" style="width:${(questionIndex/wordQuestions.length)*100}%"></div></div>
    <div class="question-text">${q[0]}</div>
    <div class="word-slots" id="word-slots">${wordAnswer.split("").map(()=>`<div class="word-slot"></div>`).join("")}</div>
    <div class="letter-bank">${letters.map((l,i)=>`<button class="letter-btn" data-letter="${i}">${l}</button>`).join("")}</div>
    <div class="feedback" id="word-feedback" aria-live="polite"></div>
    <button class="next-btn" id="word-reset" style="background:#eeeefe;color:#625be8">Ulangi susunan</button>
    <button class="next-btn" id="word-next" disabled>${questionIndex===wordQuestions.length-1?"Lihat hasil":"Kata berikutnya"} →</button>`;
  $$(".letter-btn").forEach(b=>b.addEventListener("click",()=>pickLetter(Number(b.dataset.letter),letters)));
  $("#word-reset").addEventListener("click",()=>renderWord());
  $("#word-next").addEventListener("click",()=>{questionIndex++;if(questionIndex>=wordQuestions.length)finishGame(score,wordQuestions.length);else renderWord();});
}
function pickLetter(i,letters){
  if(wordPicked.includes(i))return;wordPicked.push(i);
  const btn=$(`.letter-btn[data-letter="${i}"]`);btn.disabled=true;
  const slots=$$("#word-slots .word-slot");slots[wordPicked.length-1].textContent=letters[i];
  if(wordPicked.length===wordAnswer.length){
    const guess=wordPicked.map(n=>letters[n]).join("");
    const good=guess===wordAnswer;if(good)score++;
    $("#word-feedback").className="feedback "+(good?"good":"bad");
    $("#word-feedback").textContent=good?"✓ Tepat! Kamu berhasil menemukan katanya.":`Belum tepat. Jawabannya: ${wordAnswer}.`;
    $("#word-next").disabled=false;
  }
}
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function finishGame(correct,total){
  if(mathTimer)clearInterval(mathTimer);mathTimer=null;
  const earned=correct*10+ (correct===total&&total>0?20:0);
  stats.xp+=earned;stats.played++;stats.best=Math.max(stats.best,correct);markPlayDay();saveStats();
  const pct=total?Math.round(correct/total*100):0;
  const emoji=pct>=80?"🏆":pct>=50?"🎉":"🌱";
  $("#game-content").innerHTML=`
    <div class="result"><div class="result-emoji">${emoji}</div><div class="game-kicker">TANTANGAN SELESAI</div>
    <h2>${pct>=80?"Luar biasa!":pct>=50?"Kerja bagus!":"Tetap semangat!"}</h2>
    <p>${pct>=80?"Kamu menguasai tantangan ini. Pertahankan rasa ingin tahumu!":pct>=50?"Kemampuanmu terus berkembang. Coba lagi untuk hasil lebih baik.":"Setiap latihan membuatmu semakin pintar. Jangan menyerah!"}</p>
    <div class="result-score">+${earned} <small>XP</small></div>
    <div class="result-summary"><div><b>${correct}/${total}</b>Jawaban benar</div><div><b>${pct}%</b>Akurasi</div><div><b>${stats.xp}</b>Total XP</div></div>
    <button class="restart-btn" id="play-again">Main lagi ↻</button><button class="next-btn" id="back-home" style="background:#f1f0ff;color:#625be8">Kembali ke beranda</button></div>`;
  $("#play-again").addEventListener("click",()=>startGame(activeGame));
  $("#back-home").addEventListener("click",closeGame);
}
