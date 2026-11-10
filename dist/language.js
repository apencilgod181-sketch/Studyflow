const studyLanguages = {
  en:'English', de:'Deutsch', fr:'Français', 'zh-Hans':'简体中文', es:'Español',
  it:'Italiano', pt:'Português', ja:'日本語', ko:'한국어'
};

// Each row follows the order of the language picker.
const studyMessages = new Map(`
Language|Sprache|Langue|语言|Idioma|Lingua|Idioma|言語|언어
Theme|Design|Thème|主题|Tema|Tema|Tema|テーマ|테마
Menu|Menü|Menu|菜单|Menú|Menu|Menu|メニュー|메뉴
YOUR STUDY SPACE|DEIN LERNBEREICH|TON ESPACE D’ÉTUDE|你的学习空间|TU ESPACIO DE ESTUDIO|IL TUO SPAZIO DI STUDIO|O TEU ESPAÇO DE ESTUDO|学習スペース|나의 학습 공간
Dashboard|Übersicht|Tableau de bord|仪表盘|Panel|Panoramica|Painel|ダッシュボード|대시보드
Weekly plan|Wochenplan|Planning de la semaine|每周计划|Plan semanal|Piano settimanale|Plano semanal|週間計画|주간 계획
Study session|Lerneinheit|Séance d’étude|专注学习|Sesión de estudio|Sessione di studio|Sessão de estudo|学習セッション|학습 세션
Practice questions|Übungsfragen|Questions d’entraînement|练习题|Preguntas de práctica|Domande di pratica|Perguntas de prática|練習問題|연습 문제
Subject grades|Fachnoten|Notes par matière|各科成绩|Notas por asignatura|Voti per materia|Notas por disciplina|科目別成績|과목별 성적
Archive|Archiv|Archives|归档|Archivo|Archivio|Arquivo|アーカイブ|보관함
Personalize|Personalisieren|Personnaliser|个性化|Personalizar|Personalizza|Personalizar|カスタマイズ|개인 설정
School Sync|Schulsynchronisierung|Synchronisation scolaire|学校同步|Sincronización escolar|Sincronizzazione scolastica|Sincronização escolar|学校との同期|학교 동기화
Course setup|Kurse einrichten|Configuration des cours|课程设置|Configurar cursos|Configura i corsi|Configurar cursos|コース設定|과목 설정
My account|Mein Konto|Mon compte|我的账户|Mi cuenta|Il mio account|A minha conta|マイアカウント|내 계정
Log in|Anmelden|Se connecter|登录|Iniciar sesión|Accedi|Iniciar sessão|ログイン|로그인
Sign up|Registrieren|Créer un compte|注册|Registrarse|Registrati|Criar conta|登録|가입
Add assignment|Aufgabe hinzufügen|Ajouter un devoir|添加任务|Añadir tarea|Aggiungi compito|Adicionar tarefa|課題を追加|과제 추가
Add an assignment|Aufgabe hinzufügen|Ajouter un devoir|添加任务|Añadir tarea|Aggiungi compito|Adicionar tarefa|課題を追加|과제 추가
Edit assignment|Aufgabe bearbeiten|Modifier le devoir|编辑任务|Editar tarea|Modifica compito|Editar tarefa|課題を編集|과제 수정
Task name|Aufgabenname|Nom de la tâche|任务名称|Nombre de la tarea|Nome del compito|Nome da tarefa|課題名|과제 이름
Subject|Fach|Matière|科目|Asignatura|Materia|Disciplina|科目|과목
Type|Typ|Type|类型|Tipo|Tipo|Tipo|種類|유형
Assignment|Aufgabe|Devoir|作业|Tarea|Compito|Tarefa|課題|과제
Test|Test|Contrôle|考试|Examen|Verifica|Teste|テスト|시험
Due date|Abgabedatum|Date limite|截止日期|Fecha límite|Scadenza|Prazo|期限|마감일
Estimated minutes|Geschätzte Minuten|Durée estimée en minutes|预计分钟数|Minutos estimados|Minuti stimati|Minutos estimados|予定時間（分）|예상 시간(분)
Priority|Priorität|Priorité|优先级|Prioridad|Priorità|Prioridade|優先度|우선순위
Save changes|Änderungen speichern|Enregistrer les modifications|保存更改|Guardar cambios|Salva modifiche|Guardar alterações|変更を保存|변경사항 저장
Edit|Bearbeiten|Modifier|编辑|Editar|Modifica|Editar|編集|수정
Delete|Löschen|Supprimer|删除|Eliminar|Elimina|Eliminar|削除|삭제
Undo|Rückgängig|Annuler|撤销|Deshacer|Annulla|Desfazer|元に戻す|실행 취소
Complete|Abschließen|Terminer|完成|Completar|Completa|Concluir|完了|완료
Your dashboard|Deine Übersicht|Ton tableau de bord|你的仪表盘|Tu panel|La tua panoramica|O teu painel|ダッシュボード|나의 대시보드
Customize widgets|Widgets anpassen|Personnaliser les widgets|自定义小组件|Personalizar widgets|Personalizza i widget|Personalizar widgets|ウィジェットを編集|위젯 맞춤 설정
Done customizing|Fertig|Terminer la personnalisation|完成自定义|Terminar|Fine personalizzazione|Concluir personalização|編集を終了|편집 완료
Add widgets|Widgets hinzufügen|Ajouter des widgets|添加小组件|Añadir widgets|Aggiungi widget|Adicionar widgets|ウィジェットを追加|위젯 추가
Restore defaults|Standard wiederherstellen|Rétablir les réglages par défaut|恢复默认设置|Restaurar valores predeterminados|Ripristina impostazioni|Repor predefinições|初期設定に戻す|기본값 복원
Today’s study plan|Heutiger Lernplan|Plan d’étude du jour|今日学习计划|Plan de estudio de hoy|Piano di studio di oggi|Plano de estudo de hoje|今日の学習計画|오늘의 학습 계획
All assignments|Alle Aufgaben|Tous les devoirs|所有任务|Todas las tareas|Tutti i compiti|Todas as tarefas|すべての課題|모든 과제
Next deadlines|Nächste Abgaben|Prochaines échéances|即将到期|Próximas fechas límite|Prossime scadenze|Próximos prazos|次の締め切り|다가오는 마감일
Week at a glance|Wochenübersicht|La semaine en un coup d’œil|一周概览|La semana de un vistazo|La settimana in breve|A semana em resumo|週間の概要|한눈에 보는 한 주
This week|Diese Woche|Cette semaine|本周|Esta semana|Questa settimana|Esta semana|今週|이번 주
Previous week|Vorherige Woche|Semaine précédente|上一周|Semana anterior|Settimana precedente|Semana anterior|前の週|지난주
Next week|Nächste Woche|Semaine suivante|下一周|Semana siguiente|Settimana successiva|Próxima semana|次の週|다음 주
Study coach|Lerncoach|Coach d’étude|学习教练|Asistente de estudio|Assistente di studio|Assistente de estudo|学習コーチ|학습 코치
Your progress|Dein Fortschritt|Tes progrès|你的进度|Tu progreso|I tuoi progressi|O teu progresso|学習の進捗|나의 진행 상황
Record a grade|Note erfassen|Saisir une note|记录成绩|Registrar nota|Registra un voto|Registar uma nota|成績を記録|성적 기록
Save grade|Note speichern|Enregistrer la note|保存成绩|Guardar nota|Salva voto|Guardar nota|成績を保存|성적 저장
Grading scale|Notenskala|Barème de notation|评分标准|Escala de calificación|Scala di valutazione|Escala de classificação|評価尺度|성적 척도
Assessment name|Name der Prüfung|Nom de l’évaluation|测评名称|Nombre de la evaluación|Nome della prova|Nome da avaliação|評価名|평가 이름
Points earned|Erreichte Punkte|Points obtenus|所得分数|Puntos obtenidos|Punti ottenuti|Pontos obtidos|獲得点|받은 점수
Points possible|Mögliche Punkte|Total de points|满分|Puntos posibles|Punti disponibili|Pontos possíveis|満点|총점
Date|Datum|Date|日期|Fecha|Data|Data|日付|날짜
Weight|Gewichtung|Coefficient|权重|Peso|Peso|Peso|重み|가중치
Your grade history|Dein Notenverlauf|Ton historique de notes|成绩记录|Tu historial de notas|Storico dei voti|Histórico de notas|成績履歴|성적 기록 내역
What are you working on?|Woran arbeitest du?|Sur quoi travailles-tu ?|你在学习什么？|¿En qué estás trabajando?|Su cosa stai lavorando?|Em que estás a trabalhar?|何に取り組みますか？|무엇을 공부하고 있나요?
Free focus · No assignment|Freies Lernen · Keine Aufgabe|Concentration libre · Aucun devoir|自由专注 · 无任务|Concentración libre · Sin tarea|Studio libero · Nessun compito|Concentração livre · Sem tarefa|自由学習 · 課題なし|자유 집중 · 과제 없음
Start focusing|Lernen starten|Commencer la séance|开始专注|Empezar a concentrarse|Inizia la sessione|Iniciar sessão de estudo|集中を開始|집중 시작
Pause|Pause|Pause|暂停|Pausar|Pausa|Pausar|一時停止|일시 정지
Resume|Fortsetzen|Reprendre|继续|Continuar|Riprendi|Retomar|再開|계속
Finish session|Lerneinheit beenden|Terminer la séance|结束学习|Terminar sesión|Termina sessione|Terminar sessão|セッションを終了|세션 종료
Play a chime when time is up|Signalton am Ende abspielen|Jouer un son à la fin|时间到时播放提示音|Reproducir un sonido al terminar|Riproduci un suono alla fine|Tocar um som no fim|終了時にチャイムを鳴らす|시간이 끝나면 알림음 재생
Upload your work|Lernmaterial hochladen|Importer ton travail|上传学习资料|Subir material de estudio|Carica il materiale di studio|Carregar material de estudo|学習資料をアップロード|학습 자료 업로드
Study document|Lerndokument|Document d’étude|学习文档|Documento de estudio|Documento di studio|Documento de estudo|学習用ファイル|학습 문서
Generate practice test|Übungstest erstellen|Générer un test d’entraînement|生成练习测试|Generar prueba de práctica|Genera test di pratica|Gerar teste de prática|練習テストを生成|연습 시험 만들기
Your practice test|Dein Übungstest|Ton test d’entraînement|你的练习测试|Tu prueba de práctica|Il tuo test di pratica|O teu teste de prática|練習テスト|나의 연습 시험
Check answers|Antworten prüfen|Vérifier les réponses|检查答案|Comprobar respuestas|Controlla le risposte|Verificar respostas|答えを確認|정답 확인
Your study notes|Deine Lernnotizen|Tes notes d’étude|你的学习笔记|Tus apuntes|I tuoi appunti|Os teus apontamentos|学習ノート|나의 학습 노트
Profile and theme|Profil und Design|Profil et thème|个人资料和主题|Perfil y tema|Profilo e tema|Perfil e tema|プロフィールとテーマ|프로필 및 테마
Preferred name|Anzeigename|Nom d’affichage|显示名称|Nombre visible|Nome visualizzato|Nome de apresentação|表示名|표시 이름
Profile picture|Profilbild|Photo de profil|头像|Foto de perfil|Foto del profilo|Fotografia de perfil|プロフィール画像|프로필 사진
Accent color|Akzentfarbe|Couleur d’accent|强调色|Color de acento|Colore principale|Cor de destaque|アクセントカラー|강조 색상
Background tint|Hintergrundfarbe|Teinte de fond|背景色|Tono de fondo|Tinta di sfondo|Cor de fundo|背景色|배경 색상
Progress journal|Lerntagebuch|Journal de progression|学习日志|Diario de progreso|Diario dei progressi|Diário de progresso|学習日誌|학습 일지
Set up your study plan|Lernplan einrichten|Configure ton plan d’étude|设置学习计划|Configura tu plan de estudio|Configura il piano di studio|Configura o teu plano de estudo|学習計画を設定|학습 계획 설정
Default grading scale|Standard-Notenskala|Barème par défaut|默认评分标准|Escala de calificación predeterminada|Scala di valutazione predefinita|Escala de classificação predefinida|既定の評価尺度|기본 성적 척도
Suggested subjects|Vorgeschlagene Fächer|Matières suggérées|推荐科目|Asignaturas sugeridas|Materie consigliate|Disciplinas sugeridas|おすすめの科目|추천 과목
Save and open dashboard|Speichern und Übersicht öffnen|Enregistrer et ouvrir le tableau de bord|保存并打开仪表盘|Guardar y abrir el panel|Salva e apri la panoramica|Guardar e abrir o painel|保存してダッシュボードを開く|저장하고 대시보드 열기
Email|E-Mail|Adresse e-mail|电子邮箱|Correo electrónico|Email|Email|メールアドレス|이메일
Password|Passwort|Mot de passe|密码|Contraseña|Password|Palavra-passe|パスワード|비밀번호
Create an account|Konto erstellen|Créer un compte|创建账户|Crear cuenta|Crea un account|Criar conta|アカウントを作成|계정 만들기
Log out|Abmelden|Se déconnecter|退出登录|Cerrar sesión|Esci|Terminar sessão|ログアウト|로그아웃
Task archive|Aufgabenarchiv|Archives des tâches|任务归档|Archivo de tareas|Archivio dei compiti|Arquivo de tarefas|課題アーカイブ|과제 보관함
Restore|Wiederherstellen|Restaurer|恢复|Restaurar|Ripristina|Restaurar|復元|복원
Your week, with a little breathing room.|Deine Woche mit etwas Freiraum.|Ta semaine, avec un peu de marge.|给每周计划留一点余地。|Tu semana, con un poco de margen.|La tua settimana, con un po’ di respiro.|A tua semana, com algum espaço para respirar.|ゆとりのある一週間を。|여유가 있는 한 주를 계획하세요.
Your grades, in perspective.|Deine Noten im Überblick.|Tes notes, avec du recul.|全面了解你的成绩。|Tus notas en perspectiva.|I tuoi voti in prospettiva.|As tuas notas em perspetiva.|成績を振り返ろう。|성적을 한눈에 살펴보세요.
One task. Your full attention.|Eine Aufgabe. Deine volle Aufmerksamkeit.|Une tâche. Toute ton attention.|一次只专注于一项任务。|Una tarea. Toda tu atención.|Un compito. Tutta la tua attenzione.|Uma tarefa. Toda a tua atenção.|一つの課題に集中しよう。|한 가지 과제에 집중하세요.
Turn your work into a practice test.|Erstelle einen Übungstest aus deinem Lernmaterial.|Transforme ton travail en test d’entraînement.|将学习资料变成练习测试。|Convierte tu material en una prueba de práctica.|Trasforma il tuo lavoro in un test di pratica.|Transforma o teu trabalho num teste de prática.|学習資料から練習テストを作ろう。|학습 자료로 연습 시험을 만드세요.
Personalize StudyFlow|StudyFlow personalisieren|Personnaliser StudyFlow|个性化 StudyFlow|Personaliza StudyFlow|Personalizza StudyFlow|Personaliza o StudyFlow|StudyFlow をカスタマイズ|StudyFlow 맞춤 설정
Your overview|Dein Überblick|Ton aperçu|你的概览|Tu resumen|La tua panoramica|O teu resumo|概要|나의 요약
Your week at a glance|Deine Woche im Überblick|Ta semaine en un coup d’œil|你的一周概览|Tu semana de un vistazo|La tua settimana in breve|A tua semana em resumo|今週の概要|이번 주 요약
Your focus space|Dein Fokusbereich|Ton espace de concentration|你的专注空间|Tu espacio de concentración|Il tuo spazio di concentrazione|O teu espaço de concentração|集中スペース|나의 집중 공간
Your practice space|Dein Übungsbereich|Ton espace d’entraînement|你的练习空间|Tu espacio de práctica|Il tuo spazio di pratica|O teu espaço de prática|練習スペース|나의 연습 공간
Your subject grades|Deine Fachnoten|Tes notes par matière|你的各科成绩|Tus notas por asignatura|I tuoi voti per materia|As tuas notas por disciplina|科目別の成績|나의 과목별 성적
School connections|Schulverbindungen|Connexions scolaires|学校连接|Conexiones escolares|Collegamenti scolastici|Ligações à escola|学校との連携|학교 연결
All changes synced|Alle Änderungen synchronisiert|Toutes les modifications sont synchronisées|所有更改已同步|Todos los cambios sincronizados|Tutte le modifiche sincronizzate|Todas as alterações sincronizadas|すべての変更を同期済み|모든 변경사항 동기화됨
Changes save automatically on this device.|Änderungen werden auf diesem Gerät automatisch gespeichert.|Les modifications sont enregistrées automatiquement sur cet appareil.|更改会自动保存在此设备上。|Los cambios se guardan automáticamente en este dispositivo.|Le modifiche vengono salvate automaticamente su questo dispositivo.|As alterações são guardadas automaticamente neste dispositivo.|変更はこの端末に自動保存されます。|이 기기에 변경사항이 자동 저장됩니다.
Saved on this device.|Auf diesem Gerät gespeichert.|Enregistré sur cet appareil.|已保存在此设备上。|Guardado en este dispositivo.|Salvato su questo dispositivo.|Guardado neste dispositivo.|この端末に保存しました。|이 기기에 저장되었습니다.
Creating your test…|Übungstest wird erstellt…|Création du test…|正在生成测试…|Creando tu prueba…|Creazione del test…|A criar o teu teste…|テストを作成中…|시험을 만드는 중…
Ready when you are.|Bereit, wenn du es bist.|Prêt quand tu l’es.|准备好就开始吧。|Cuando quieras, empezamos.|Quando vuoi, puoi iniziare.|Começa quando estiveres pronto.|準備ができたら始めましょう。|준비가 되면 시작하세요.
Your progress at a glance|Dein Fortschritt im Überblick|Tes progrès en un coup d’œil|学习进度概览|Tu progreso de un vistazo|I tuoi progressi in breve|O teu progresso em resumo|進捗の概要|진행 상황 한눈에 보기
View grades|Noten ansehen|Voir les notes|查看成绩|Ver notas|Vedi i voti|Ver notas|成績を見る|성적 보기
Weighted grade average|Gewichteter Notendurchschnitt|Moyenne pondérée|加权平均成绩|Promedio ponderado|Media ponderata|Média ponderada|加重平均|가중 평균 성적
Recorded grades|Erfasste Noten|Notes enregistrées|已记录的成绩|Notas registradas|Voti registrati|Notas registadas|記録した成績|기록된 성적
Tasks completed|Erledigte Aufgaben|Tâches terminées|已完成的任务|Tareas completadas|Compiti completati|Tarefas concluídas|完了した課題|완료한 과제
Open tasks|Offene Aufgaben|Tâches en cours|待完成的任务|Tareas pendientes|Compiti aperti|Tarefas pendentes|未完了の課題|남은 과제
Your questions will appear here.|Deine Fragen erscheinen hier.|Tes questions s’afficheront ici.|你的练习题会显示在这里。|Tus preguntas aparecerán aquí.|Le tue domande appariranno qui.|As tuas perguntas aparecem aqui.|問題はここに表示されます。|질문이 여기에 표시됩니다.
Room to breathe.|Zeit zum Durchatmen.|Un peu de répit.|留一点喘息的时间。|Un momento para respirar.|Un po’ di respiro.|Um pouco de descanso.|ひと息つける時間。|잠깐 숨을 돌리세요.
About your studies|Über dein Lernen|À propos de tes études|关于你的学习|Sobre tus estudios|I tuoi studi|Sobre os teus estudos|学習について|학습 정보
Daily study time (minutes)|Tägliche Lernzeit (Minuten)|Temps d’étude quotidien (minutes)|每日学习时间（分钟）|Tiempo diario de estudio (minutos)|Tempo di studio giornaliero (minuti)|Tempo diário de estudo (minutos)|毎日の学習時間（分）|하루 학습 시간(분)
Skip for now|Jetzt überspringen|Passer pour le moment|暂时跳过|Omitir por ahora|Salta per ora|Ignorar por agora|今はスキップ|지금은 건너뛰기
`.trim().split('\n').map(row=>{const [source,...translations]=row.split('|');return [source,translations];}));

const languageCodes = Object.keys(studyLanguages);
const languageStorage = 'studyflow.language.v1';
let studyLanguage = 'en';
try {
  const saved = localStorage.getItem(languageStorage);
  if (Object.hasOwn(studyLanguages,saved)) studyLanguage = saved;
} catch { /* English is available without browser storage. */ }
document.documentElement.lang = studyLanguage;

function studyTranslate(text) {
  const label = text.trim();
  const match = label.match(/^([▦▤◷✧▥▣✿⇄☷＋▷Ⅱ]\s+)?(.+?)(\s+[→↗＋✧])?$/);
  if (!match || studyLanguage==='en') return text;
  const translated = studyMessages.get(match[2])?.[languageCodes.indexOf(studyLanguage)-1];
  return translated ? text.replace(label,()=> (match[1]||'')+translated+(match[3]||'')) : text;
}

const languageSources = new WeakMap();
function translateStudyUI() {
  const roots = document.querySelectorAll('.sidebar, .topbar, #main, #assignment-dialog, #toast');
  for (const root of roots) {
    const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    for (let node=walker.nextNode();node;node=walker.nextNode()) {
      if (node.parentElement?.closest('.task-title,.subject,.week-task p,.grade-row strong,.overview-recent strong,.journal-entry h3,.journal-note,.profile-preview,.coach-output,.account-profile h2,.sidebar-account small,.subject-card h2,#practice-quiz fieldset,textarea,script,style')) continue;
      const previous = languageSources.get(node);
      const source = previous?.last===node.data ? previous.source : node.data;
      const last = studyTranslate(source);
      languageSources.set(node,{source,last});
      if (node.data!==last) node.data = last;
    }
    for (const element of root.querySelectorAll('[aria-label]')) {
      const value = element.getAttribute('aria-label');
      const previous = languageSources.get(element);
      const source = previous?.last===value ? previous.source : value;
      const last = studyTranslate(source);
      languageSources.set(element,{source,last});
      if (value!==last) element.setAttribute('aria-label',last);
    }
  }
}

const languagePicker = document.querySelector('#studyflow-language');
languagePicker.value = studyLanguage;
languagePicker.addEventListener('change',()=>{
  studyLanguage = languagePicker.value;
  document.documentElement.lang = studyLanguage;
  try { localStorage.setItem(languageStorage,studyLanguage); } catch { /* Use the selection for this visit. */ }
  render();
  translateStudyUI();
});
new MutationObserver(translateStudyUI).observe(document.body,{childList:true,characterData:true,subtree:true});
translateStudyUI();
