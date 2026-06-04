// Initializing Lucide Icons
document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    renderInboxTasks('all');
    renderDailyPlan();
    updateDashboardStats();
    setupChartTooltips();

    // File upload handler
    const fileInput = document.querySelector('.upload-btn input[type="file"]');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                playSound('success');
                showTypingIndicator(true);
                setTimeout(() => {
                    showTypingIndicator(false);
                    addCoachMessage('Ich habe deine Datei "' + fileName + '" empfangen und analysiert. Soll ich eine Aufgabe daraus erstellen?');
                }, 1000);
            }
        });
    }

    // Initial typing notification from ADHS-Copilot
    setTimeout(() => {
        showTypingIndicator(true);
        setTimeout(() => {
            showTypingIndicator(false);
            addCoachMessage("Ich habe 10 neue Aufgaben aus deinen Kanälen gesammelt. Schau unter 'Tagesstart & Tasks' nach – ich habe sie bereits nach Dringlichkeit priorisiert!");
        }, 1200);
    }, 2000);
});

// ========== APP STATE ==========
let state = {
    activeTab: 'dashboard',
    currentFilter: 'all',
    currentImpulseMode: 'freeze',
    maxTimerSeconds: 60,
    timerSecondsLeft: 60,
    timerInterval: null,
    timerRunning: false,
    currentImpulse: '',
    retroStep: 1,
    retroData: {
        focusMood: '',
        reflectionText: '',
        helpfulTools: []
    }
};

// ========== AUDIO FEEDBACK (WEB AUDIO API) ==========
let audioCtx = null;

function playSound(type) {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        if (type === 'tick') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, now);
            gain.gain.setValueAtTime(0.003, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        } else if (type === 'start') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'success') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime(freq, now + idx * 0.08);
                g.gain.setValueAtTime(0.04, now + idx * 0.08);
                g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.5);
                o.start(now + idx * 0.08);
                o.stop(now + idx * 0.08 + 0.5);
            });
        } else if (type === 'click') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(700, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
        }
    } catch (e) {
        console.warn("Audio context could not play sound:", e);
    }
}

// ========== MOCK DATA: INBOX TASKS ==========
let inboxTasks = [
    {
        id: 1,
        title: "Kundenpräsentation bis 14:00 fertigstellen",
        source: "email",
        sender: "Lisa Meier",
        time: "08:12",
        priority: "high",
        deadline: "Heute, 14:00",
        duration: "45 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '1-1', title: "Gliederung & Struktur überprüfen", completed: false, duration: "10 Min" },
            { id: '1-2', title: "Fokus-Inhalte & Text ausformulieren", completed: false, duration: "15 Min" },
            { id: '1-3', title: "Grafiken & Diagramme einfügen", completed: false, duration: "10 Min" },
            { id: '1-4', title: "Abschluss-Check & Folienübergänge testen", completed: false, duration: "10 Min" }
        ]
    },
    {
        id: 2,
        title: "Sprint-Review Notizen teilen",
        source: "slack",
        sender: "#produkt-team",
        time: "08:45",
        priority: "high",
        deadline: "Heute, 11:00",
        duration: "15 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '2-1', title: "Notizen-Dokument öffnen & Stichpunkte ordnen", completed: false, duration: "5 Min" },
            { id: '2-2', title: "Ergebnisse der Teams stichpunktartig zusammenfassen", completed: false, duration: "5 Min" },
            { id: '2-3', title: "Aktionspunkte (Action Items) klar markieren", completed: false, duration: "3 Min" },
            { id: '2-4', title: "Notizen kopieren und im Slack #team-sprint posten", completed: false, duration: "2 Min" }
        ]
    },
    {
        id: 3,
        title: "Arzttermin morgen bestätigen",
        source: "whatsapp",
        sender: "Praxis Dr. König",
        time: "09:03",
        priority: "medium",
        deadline: "Heute",
        duration: "5 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '3-1', title: "Praxisnummer heraussuchen", completed: false, duration: "1 Min" },
            { id: '3-2', title: "Anruf tätigen & Terminzeit abgleichen", completed: false, duration: "3 Min" },
            { id: '3-3', title: "Termin im Kalender blockieren", completed: false, duration: "1 Min" }
        ]
    },
    {
        id: 4,
        title: "Feedback zu Design-Entwürfen geben",
        source: "slack",
        sender: "@marie.design",
        time: "09:20",
        priority: "medium",
        deadline: "Morgen",
        duration: "20 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '4-1', title: "Figma-Link aus Slack öffnen", completed: false, duration: "2 Min" },
            { id: '4-2', title: "Die 3 neuen Mockups sichten & Notizen machen", completed: false, duration: "8 Min" },
            { id: '4-3', title: "Feedback-Kommentare am Design platzieren", completed: false, duration: "10 Min" }
        ]
    },
    {
        id: 5,
        title: "Reisekostenabrechnung einreichen",
        source: "email",
        sender: "HR Abteilung",
        time: "Gestern",
        priority: "low",
        deadline: "Freitag",
        duration: "10 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '5-1', title: "Belege auf dem Smartphone sichten & PDF erstellen", completed: false, duration: "4 Min" },
            { id: '5-2', title: "Abrechnungsportal öffnen & Beträge eintragen", completed: false, duration: "4 Min" },
            { id: '5-3', title: "Belege hochladen und Formular absenden", completed: false, duration: "2 Min" }
        ]
    },
    {
        id: 6,
        title: "Mama wegen Geburtstagsgeschenk anrufen",
        source: "whatsapp",
        sender: "Mama",
        time: "Gestern",
        priority: "low",
        deadline: "Diese Woche",
        duration: "10 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '6-1', title: "Ideenliste für Geschenke kurz sichten", completed: false, duration: "2 Min" },
            { id: '6-2', title: "Mama anrufen & Pläne besprechen", completed: false, duration: "6 Min" },
            { id: '6-3', title: "Gemeinsames Geschenk online bestellen", completed: false, duration: "2 Min" }
        ]
    },
    {
        id: 7,
        title: "Steuererklärung Belege nachreichen",
        source: "email",
        sender: "Finanzamt",
        time: "Gestern",
        priority: "high",
        deadline: "Heute, 17:00",
        duration: "30 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '7-1', title: "Ordner mit Steuerbelegen öffnen", completed: false, duration: "5 Min" },
            { id: '7-2', title: "Fehlende Spendenquittung digitalisieren", completed: false, duration: "10 Min" },
            { id: '7-3', title: "Elster-Portal öffnen & Belege hochladen", completed: false, duration: "10 Min" },
            { id: '7-4', title: "Bestätigung herunterladen & ablegen", completed: false, duration: "5 Min" }
        ]
    },
    {
        id: 8,
        title: "Status-Update für wöchentliches Meeting schreiben",
        source: "slack",
        sender: "#team-status",
        time: "09:45",
        priority: "medium",
        deadline: "Morgen",
        duration: "10 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '8-1', title: "Kalendereinträge der letzten Woche sichten", completed: false, duration: "3 Min" },
            { id: '8-2', title: "Erfolge & Fortschritte stichpunktartig auflisten", completed: false, duration: "4 Min" },
            { id: '8-3', title: "Hürden oder Blocker für nächste Woche formulieren", completed: false, duration: "3 Min" }
        ]
    },
    {
        id: 9,
        title: "Kollegen Klaus Projektnummern schicken",
        source: "whatsapp",
        sender: "Klaus (Marketing)",
        time: "10:15",
        priority: "low",
        deadline: "Heute",
        duration: "5 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '9-1', title: "Projekt-Datenbank oder Wiki öffnen", completed: false, duration: "2 Min" },
            { id: '9-2', title: "Projektnummern kopieren", completed: false, duration: "1 Min" },
            { id: '9-3', title: "WhatsApp-Chat mit Klaus öffnen & einfügen", completed: false, duration: "2 Min" }
        ]
    },
    {
        id: 10,
        title: "Pflanzen im Büro gießen",
        source: "manual",
        sender: "Du",
        time: "10:30",
        priority: "low",
        deadline: "Heute",
        duration: "5 Min",
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: [
            { id: '10-1', title: "Gießkanne mit frischem Wasser füllen", completed: false, duration: "2 Min" },
            { id: '10-2', title: "Alle Büropflanzen gießen", completed: false, duration: "2 Min" },
            { id: '10-3', title: "Gießkanne wieder entleeren & verstauen", completed: false, duration: "1 Min" }
        ]
    }
];

let nextTaskId = 11;

// ========== SOURCE CONFIG ==========
const SOURCE_CONFIG = {
    email: { label: "E-Mail", icon: "mail" },
    whatsapp: { label: "WhatsApp", icon: "message-circle" },
    slack: { label: "Slack", icon: "hash" },
    manual: { label: "Manuell", icon: "plus-circle" }
};

// ========== SOMATIC IMPULSES FOR ADHD FLOW MANAGEMENT ==========
const IMPULSES_FREEZE = [
    "Schüttle deine Hände, Arme und Beine für 30 Sekunden kräftig aus. Lass die Anspannung los!",
    "Mache 5 schnelle Kniebeugen oder Hampelmänner, um deinen Kreislauf anzukurbeln.",
    "Wasche dein Gesicht mit eiskaltem Wasser ab und spüre den sprunghaften Frische-Kick.",
    "Laufe einmal zügig durch alle Räume deiner Wohnung/deines Büros und komm zurück.",
    "Summe oder singe dein aktuelles Lieblingslied für 45 Sekunden laut mit (aktiviert den Vagusnerv).",
    "Stretche dich weit nach oben, atme tief ein und lass dich beim Ausatmen locker hängen."
];

const IMPULSES_HYPERFOCUS = [
    "Klappe den Laptop zu oder schalte den Monitor aus. Atme 3x tief aus und strecke dich.",
    "Schreibe dein aktuelles Zwischenergebnis in 3 Stichpunkten auf ein Papier, stehe auf und verlasse den Raum.",
    "Blicke vom Bildschirm weg und schaue für genau 1 Minute aus dem Fenster ins Weite.",
    "Reibe deine Hände warm und lege sie für 30 Sekunden sanft auf deine geschlossenen Augen (Palmieren).",
    "Mache dir einen Tee oder hole Wasser, trinke es im Stehen, ohne auf dein Handy zu schauen.",
    "Nimm eine aufrechte Haltung ein und mache 3 bewusste, langsame Schulterkreise nach hinten."
];


// ========== MICROTASK GENERATOR (KEYWORDS) ==========
function generateMicrotasksForTitle(title) {
    const lower = title.toLowerCase();
    
    if (lower.includes('brief') || lower.includes('schreiben') || lower.includes('mail') || lower.includes('nachricht') || lower.includes('email') || lower.includes('slak') || lower.includes('slack')) {
        return [
            { id: 'custom-1', title: "Empfänger & Betreff eintragen", completed: false, duration: "2 Min" },
            { id: 'custom-2', title: "Kernanliegen in 2-3 Sätzen formulieren", completed: false, duration: "6 Min" },
            { id: 'custom-3', title: "Korrekturlesen & Anhänge prüfen", completed: false, duration: "2 Min" },
            { id: 'custom-4', title: "Nachricht absenden / Brief einwerfen", completed: false, duration: "2 Min" }
        ];
    }
    
    if (lower.includes('anruf') || lower.includes('telefon') || lower.includes('anrufen') || lower.includes('kontakt')) {
        return [
            { id: 'custom-1', title: "Telefonnummer heraussuchen", completed: false, duration: "1 Min" },
            { id: 'custom-2', title: "Notizen & Stift bereitlegen", completed: false, duration: "1 Min" },
            { id: 'custom-3', title: "Anruf tätigen & Fragen stellen", completed: false, duration: "6 Min" },
            { id: 'custom-4', title: "Ergebnisse kurz notieren", completed: false, duration: "2 Min" }
        ];
    }

    if (lower.includes('räumen') || lower.includes('raeumen') || lower.includes('aufräumen') || lower.includes('aufraeumen') || lower.includes('putzen') || lower.includes('wäsche') || lower.includes('waesche') || lower.includes('küche') || lower.includes('kueche') || lower.includes('zimmer')) {
        return [
            { id: 'custom-1', title: "Musik anmachen & Timer auf 5 Minuten stellen", completed: false, duration: "1 Min" },
            { id: 'custom-2', title: "Eine konkrete Ecke oder Oberfläche freiräumen", completed: false, duration: "5 Min" },
            { id: 'custom-3', title: "Müll entsorgen & Sachen an ihren Platz bringen", completed: false, duration: "3 Min" },
            { id: 'custom-4', title: "Durchatmen & Fortschritt bewundern", completed: false, duration: "1 Min" }
        ];
    }
    
    if (lower.includes('präsentation') || lower.includes('praesentation') || lower.includes('vorbereiten') || lower.includes('konzept') || lower.includes('bericht') || lower.includes('dokument') || lower.includes('angebot')) {
        return [
            { id: 'custom-1', title: "Grobes Konzept & Leitfaden skizzieren", completed: false, duration: "5 Min" },
            { id: 'custom-2', title: "Struktur aufbauen & Inhalte befüllen", completed: false, duration: "15 Min" },
            { id: 'custom-3', title: "Formatierung & optische Details anpassen", completed: false, duration: "8 Min" },
            { id: 'custom-4', title: "Einmal komplett durchlesen / testen", completed: false, duration: "2 Min" }
        ];
    }

    // Generic fallback for any other task
    return [
        { id: 'custom-1', title: "Arbeitsplatz vorbereiten & Ablenkungen stummschalten", completed: false, duration: "2 Min" },
        { id: 'custom-2', title: "Ersten Schritt tun (nur 5 Minuten lang anfangen)", completed: false, duration: "5 Min" },
        { id: 'custom-3', title: "Details ausarbeiten & Struktur ergänzen", completed: false, duration: "10 Min" },
        { id: 'custom-4', title: "Ergebnis prüfen & zufrieden abhaken", completed: false, duration: "3 Min" }
    ];
}

// ========== TAB NAVIGATOR ==========
function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    const activeLink = document.getElementById('tab-' + tabName);
    if (activeLink) activeLink.classList.add('active');
    document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById('panel-' + tabName);
    if (activePanel) activePanel.classList.add('active');
    lucide.createIcons();
}

// ========== INBOX TASKS RENDERING ==========
function filterInbox(source, btnElement) {
    state.currentFilter = source;
    document.querySelectorAll('.source-filter-chip').forEach(c => c.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderInboxTasks(source);
}

function renderInboxTasks(filter) {
    const container = document.getElementById('inbox-task-list');
    if (!container) return;
    container.innerHTML = '';

    let filtered = inboxTasks;
    if (filter && filter !== 'all') {
        filtered = inboxTasks.filter(t => t.source === filter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); padding: 10px; font-size: 0.85rem;">Keine Aufgaben aus dieser Quelle.</p>';
        return;
    }

    const priorityLabel = { high: 'Dringend', medium: 'Mittel', low: 'Niedrig' };

    filtered.forEach(task => {
        const group = document.createElement('div');
        group.className = 'task-group-container';
        group.style.display = 'flex';
        group.style.flexDirection = 'column';
        group.style.width = '100%';
        group.style.gap = '8px';

        const item = document.createElement('div');
        item.className = 'inbox-task-item' + (task.completed ? ' completed' : '');
        item.onclick = () => toggleInboxTask(task.id);

        const src = SOURCE_CONFIG[task.source] || SOURCE_CONFIG.manual;
        const decomposeActive = task.decomposed ? ' active' : '';

        item.innerHTML =
            '<div class="checkbox-custom"><i data-lucide="check"></i></div>' +
            '<div class="inbox-task-info">' +
                '<span class="inbox-task-title">' + task.title + '</span>' +
                '<div class="task-metadata-row">' +
                    '<span class="metadata-item priority ' + task.priority + '"><i data-lucide="flag" style="width:12px;height:12px;"></i> ' + priorityLabel[task.priority] + '</span>' +
                    '<span class="metadata-item"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ' + task.deadline + '</span>' +
                    '<span class="metadata-item"><i data-lucide="send" style="width:12px;height:12px;"></i> ' + src.label + ' (' + task.sender + ' &middot; ' + task.time + ')</span>' +
                '</div>' +
            '</div>' +
            '<button class="btn-decompose' + decomposeActive + '" onclick="toggleDecomposition(' + task.id + ', event)">' +
                '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Zerlegen' +
            '</button>';

        group.appendChild(item);

        // Render subtasks
        if (task.microtasks && task.microtasks.length > 0) {
            const subContainer = document.createElement('div');
            subContainer.className = 'microtask-sublist-container' + (task.decomposed ? ' expanded' : '');
            
            const nextSubIdx = task.microtasks.findIndex(sub => !sub.completed);
            if (nextSubIdx !== -1) {
                const sub = task.microtasks[nextSubIdx];
                const kpi = (nextSubIdx + 1) + '/' + task.microtasks.length;
                
                const subItem = document.createElement('div');
                subItem.className = 'microtask-subitem' + (sub.completed ? ' completed' : '');
                subItem.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubtask(task.id, nextSubIdx);
                };

                subItem.innerHTML =
                    '<div class="checkbox-custom sub-check"><i data-lucide="check" style="width: 10px; height: 10px;"></i></div>' +
                    '<span class="checklist-text" style="font-weight: 600;">' + sub.title + '</span>' +
                    '<span class="checklist-tag time" style="margin-left: auto; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">' + kpi + '</span>';

                subContainer.appendChild(subItem);
            }

            group.appendChild(subContainer);
        }

        container.appendChild(group);
    });

    const activeTasks = inboxTasks.filter(t => !t.completed);
    const badge = document.getElementById('inbox-count-badge');
    if (badge) badge.innerText = activeTasks.length + ' neue';

    lucide.createIcons();
}

function toggleInboxTask(id) {
    const task = inboxTasks.find(t => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    
    // Play sound feedback
    if (task.completed) {
        playSound('success');
        // Automatically check off all subtasks if parent is completed
        if (task.microtasks) {
            task.microtasks.forEach(sub => sub.completed = true);
        }
    } else {
        playSound('click');
        // Uncheck all subtasks if parent is unchecked
        if (task.microtasks) {
            task.microtasks.forEach(sub => sub.completed = false);
        }
    }

    renderInboxTasks(state.currentFilter);
    renderDailyPlan();
    updateDashboardStats();

    if (task.completed) {
        showTypingIndicator(true);
        setTimeout(() => {
            showTypingIndicator(false);
            const msgs = [
                'Super! "' + task.title + '" komplett erledigt. Weiter so!',
                'Abgehakt! Dein Gehirn bekommt gerade einen kleinen Dopamin-Boost. Großartig!',
                'Erledigt! Siehst du, wie sich die Liste verkürzt? Ein Schritt nach dem anderen.'
            ];
            addCoachMessage(msgs[Math.floor(Math.random() * msgs.length)]);
        }, 800);
    }
}

// ========== MICROTASK DECOMPOSITION TOGGLE ==========
function toggleDecomposition(id, event) {
    if (event) event.stopPropagation();
    const task = inboxTasks.find(t => t.id === id);
    if (!task) return;
    task.decomposed = !task.decomposed;
    
    playSound('click');
    
    renderInboxTasks(state.currentFilter);
    renderDailyPlan();
    
    if (task.decomposed) {
        showTypingIndicator(true);
        setTimeout(() => {
            showTypingIndicator(false);
            addCoachMessage('Gute Wahl! Ich habe "' + task.title + '" in kleine, bewältigbare Microtasks zerlegen können. Fange einfach mit dem ersten kleinen Schritt an. Das nimmt den Druck raus!');
        }, 1000);
    }
}

function toggleSubtask(taskId, subIndex) {
    const task = inboxTasks.find(t => t.id === taskId);
    if (!task) return;
    const sub = task.microtasks[subIndex];
    if (!sub) return;
    sub.completed = !sub.completed;
    
    playSound('click');
    
    // Check if all subtasks are completed
    const allCompleted = task.microtasks.every(s => s.completed);
    
    if (allCompleted && !task.completed) {
        task.completed = true;
        playSound('success');
        
        showTypingIndicator(true);
        setTimeout(() => {
            showTypingIndicator(false);
            addCoachMessage('Fantastisch! Du hast alle Schritte für "' + task.title + '" abgeschlossen. Die gesamte Aufgabe ist damit erledigt! Super Fokus! 🎉');
        }, 1000);
    } else if (!allCompleted && task.completed) {
        task.completed = false;
    }
    
    renderInboxTasks(state.currentFilter);
    renderDailyPlan();
    updateDashboardStats();
}

// ========== DAILY PLAN RENDERING ==========
function renderDailyPlan() {
    const container1 = document.getElementById('daily-plan-list');
    const container2 = document.getElementById('dashboard-daily-plan-list');
    const containers = [];
    if (container1) containers.push(container1);
    if (container2) containers.push(container2);
    if (containers.length === 0) return;

    containers.forEach(c => c.innerHTML = '');

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const planTasks = inboxTasks
        .filter(t => t.inPlan)
        .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

    const priorityLabel = { high: 'Dringend', medium: 'Mittel', low: 'Niedrig' };
    const topFiveTasks = planTasks.slice(0, 5);

    topFiveTasks.forEach((task, idx) => {
        const rank = idx + 1;
        const isTop = rank === 1 && !task.completed;
        const src = SOURCE_CONFIG[task.source] || SOURCE_CONFIG.manual;
        const decomposeActive = task.decomposed ? ' active' : '';

        containers.forEach(container => {
            const group = document.createElement('div');
            group.className = 'task-group-container';
            group.style.display = 'flex';
            group.style.flexDirection = 'column';
            group.style.width = '100%';
            group.style.gap = '8px';

            const item = document.createElement('div');
            item.className = 'daily-plan-item' + (task.completed ? ' completed' : '') + (isTop ? ' top-priority' : '');
            item.onclick = () => toggleInboxTask(task.id);

            item.innerHTML =
                '<div class="plan-rank">' + rank + '</div>' +
                '<div class="checkbox-custom"><i data-lucide="check"></i></div>' +
                '<div class="plan-task-info">' +
                    '<span class="plan-task-title">' + task.title + '</span>' +
                    '<div class="task-metadata-row">' +
                        '<span class="metadata-item priority ' + task.priority + '"><i data-lucide="flag" style="width:12px;height:12px;"></i> ' + priorityLabel[task.priority] + '</span>' +
                        '<span class="metadata-item"><i data-lucide="calendar" style="width:12px;height:12px;"></i> ' + task.deadline + '</span>' +
                        '<span class="metadata-item"><i data-lucide="send" style="width:12px;height:12px;"></i> via ' + src.label + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="plan-task-tags">' +
                    '<button class="btn-decompose' + decomposeActive + '" onclick="toggleDecomposition(' + task.id + ', event)">' +
                        '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Zerlegen' +
                    '</button>' +
                '</div>';

            group.appendChild(item);

            // Render subtasks
            if (task.microtasks && task.microtasks.length > 0) {
                const subContainer = document.createElement('div');
                subContainer.className = 'microtask-sublist-container' + (task.decomposed ? ' expanded' : '');
                
                const nextSubIdx = task.microtasks.findIndex(sub => !sub.completed);
                if (nextSubIdx !== -1) {
                    const sub = task.microtasks[nextSubIdx];
                    const kpi = (nextSubIdx + 1) + '/' + task.microtasks.length;
                    
                    const subItem = document.createElement('div');
                    subItem.className = 'microtask-subitem' + (sub.completed ? ' completed' : '');
                    subItem.onclick = (e) => {
                        e.stopPropagation();
                        toggleSubtask(task.id, nextSubIdx);
                    };

                    subItem.innerHTML =
                        '<div class="checkbox-custom sub-check"><i data-lucide="check" style="width:10px;height:10px;"></i></div>' +
                        '<span class="checklist-text" style="font-weight: 600;">' + sub.title + '</span>' +
                        '<span class="checklist-tag time" style="margin-left: auto; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">' + kpi + '</span>';

                    subContainer.appendChild(subItem);
                }

                group.appendChild(subContainer);
            }

            container.appendChild(group);
        });
    });

    const topTask = planTasks.find(t => !t.completed);
    const dashPrio = document.getElementById('dashboard-priotask-title');
    const tasksPrio = document.getElementById('tasks-priotask-title');
    const decompBtn = document.getElementById('tasks-priotask-decompose-btn');
    const subContainer = document.getElementById('tasks-priotask-subtasks');

    if (dashPrio) {
        dashPrio.innerText = topTask ? topTask.title : 'Alle Aufgaben erledigt!';
    }

    if (tasksPrio) {
        tasksPrio.innerText = topTask ? topTask.title : 'Alle Aufgaben erledigt!';
    }

    if (decompBtn) {
        if (topTask) {
            decompBtn.style.display = 'inline-flex';
            decompBtn.onclick = (e) => {
                toggleDecomposition(topTask.id, e);
            };
            if (topTask.decomposed) {
                decompBtn.classList.add('active');
            } else {
                decompBtn.classList.remove('active');
            }
        } else {
            decompBtn.style.display = 'none';
        }
    }

    if (subContainer) {
        subContainer.innerHTML = '';
        if (topTask && topTask.decomposed && topTask.microtasks && topTask.microtasks.length > 0) {
            const nextSubIdx = topTask.microtasks.findIndex(sub => !sub.completed);
            if (nextSubIdx !== -1) {
                subContainer.classList.add('expanded');
                const sub = topTask.microtasks[nextSubIdx];
                const kpi = (nextSubIdx + 1) + '/' + topTask.microtasks.length;
                const subItem = document.createElement('div');
                subItem.className = 'microtask-subitem' + (sub.completed ? ' completed' : '');
                subItem.style.background = '#fff';
                subItem.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubtask(topTask.id, nextSubIdx);
                };
                subItem.innerHTML =
                    '<div class="checkbox-custom sub-check"><i data-lucide="check" style="width:10px;height:10px;"></i></div>' +
                    '<div style="display: flex; flex-direction: column; gap: 2px; text-align: left; width: 100%; min-width: 0; flex-grow: 1;">' +
                        '<div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">' +
                            '<span style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Nächster konkreter Teilschritt</span>' +
                            '<span class="checklist-tag time" style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">' + kpi + '</span>' +
                        '</div>' +
                        '<span class="checklist-text" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">' + sub.title + '</span>' +
                    '</div>';
                subContainer.appendChild(subItem);
            } else {
                subContainer.classList.remove('expanded');
            }
        } else {
            subContainer.classList.remove('expanded');
        }
    }

    renderFocusTask();

    lucide.createIcons();
}

function renderFocusTask() {
    const card = document.getElementById('focus-task-card');
    if (!card) return;

    // Find the next incomplete task in the prioritized daily plan
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const planTasks = inboxTasks
        .filter(t => t.inPlan && !t.completed)
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const focusTask = planTasks[0];

    const parentTitle = document.getElementById('focus-parent-title');
    const mainTitle = document.getElementById('focus-main-title');
    const microtaskBlock = document.getElementById('focus-microtask-block');
    const microtaskTitle = document.getElementById('focus-microtask-title');
    const microtaskCheckbox = document.getElementById('focus-microtask-checkbox');
    const completeBtn = document.getElementById('focus-complete-btn');
    const decomposeBtn = document.getElementById('focus-decompose-btn');
    const badge = document.getElementById('focus-priority-badge');

    if (!focusTask) {
        // No task left!
        if (parentTitle) parentTitle.style.display = 'none';
        if (mainTitle) mainTitle.innerText = 'Alle Aufgaben für heute erledigt! 🎉';
        if (microtaskBlock) microtaskBlock.style.display = 'none';
        if (completeBtn) completeBtn.style.display = 'none';
        if (decomposeBtn) decomposeBtn.style.display = 'none';
        if (badge) badge.style.display = 'none';
        return;
    }

    // Task exists
    if (completeBtn) completeBtn.style.display = 'inline-flex';
    if (badge) {
        badge.style.display = 'inline-block';
        const priorityLabel = { high: 'Dringend', medium: 'Mittel', low: 'Niedrig' };
        badge.innerText = priorityLabel[focusTask.priority];
        badge.className = 'checklist-tag priority-' + focusTask.priority;
    }

    // Set title
    if (mainTitle) mainTitle.innerText = focusTask.title;

    if (focusTask.decomposed && focusTask.microtasks && focusTask.microtasks.length > 0) {
        // Find next incomplete microtask
        const nextSubIdx = focusTask.microtasks.findIndex(sub => !sub.completed);
        
        if (nextSubIdx !== -1) {
            const sub = focusTask.microtasks[nextSubIdx];
            if (parentTitle) {
                parentTitle.style.display = 'block';
                parentTitle.innerText = 'Übergeordnete Aufgabe:';
            }
            if (microtaskBlock) microtaskBlock.style.display = 'flex';
            if (microtaskTitle) microtaskTitle.innerText = sub.title;
            if (decomposeBtn) decomposeBtn.style.display = 'none';

            // Connect subtask completion to checkbox and button
            if (microtaskCheckbox) {
                microtaskCheckbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleSubtask(focusTask.id, nextSubIdx);
                };
            }

            if (completeBtn) {
                completeBtn.onclick = () => {
                    toggleSubtask(focusTask.id, nextSubIdx);
                };
            }
        } else {
            // Decomposed, but all subtasks are complete (should toggle parent completion)
            if (parentTitle) parentTitle.style.display = 'none';
            if (microtaskBlock) microtaskBlock.style.display = 'none';
            if (decomposeBtn) decomposeBtn.style.display = 'none';

            if (completeBtn) {
                completeBtn.onclick = () => {
                    toggleInboxTask(focusTask.id);
                };
            }
        }
    } else {
        // Not decomposed
        if (parentTitle) parentTitle.style.display = 'none';
        if (microtaskBlock) microtaskBlock.style.display = 'none';
        
        // Show Decompose button to let them break it down easily
        if (decomposeBtn) {
            decomposeBtn.style.display = 'inline-flex';
            decomposeBtn.onclick = (e) => {
                toggleDecomposition(focusTask.id, e);
            };
        }

        // Complete button completes the whole task
        if (completeBtn) {
            completeBtn.onclick = () => {
                toggleInboxTask(focusTask.id);
            };
        }
    }
}

// ========== ADD NEW TASK ==========
function addNewTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;

    let priority = 'medium';
    const lower = text.toLowerCase();
    if (lower.includes('dringend') || lower.includes('sofort') || lower.includes('asap') || lower.includes('heute') || lower.includes('wichtig')) {
        priority = 'high';
    } else if (lower.includes('irgendwann') || lower.includes('optional') || lower.includes('später')) {
        priority = 'low';
    }

    let deadline = 'Heute';
    if (lower.includes('morgen')) deadline = 'Morgen';
    else if (lower.includes('freitag')) deadline = 'Freitag';
    else if (lower.includes('woche')) deadline = 'Nächste Woche';

    let duration = '15 Min';
    if (lower.includes('anruf') || lower.includes('mail') || lower.includes('bestätig') || lower.includes('checken') || lower.includes('kurz')) {
        duration = '5 Min';
    } else if (lower.includes('vorbereiten') || lower.includes('erstellen') || lower.includes('präsentation') || lower.includes('konzept') || lower.includes('aufräumen')) {
        duration = '30 Min';
    }

    // Auto-generate microtasks
    const subtasks = generateMicrotasksForTitle(text);

    const newTask = {
        id: nextTaskId++,
        title: text,
        source: 'manual',
        sender: 'Du',
        time: 'Gerade eben',
        priority: priority,
        deadline: deadline,
        duration: duration,
        completed: false,
        inPlan: true,
        decomposed: false,
        microtasks: subtasks
    };

    inboxTasks.push(newTask);
    input.value = '';

    playSound('click');

    renderInboxTasks(state.currentFilter);
    renderDailyPlan();
    updateDashboardStats();

    const priorityLabel = { high: 'Dringend', medium: 'Mittel', low: 'Niedrig' };
    showTypingIndicator(true);
    setTimeout(() => {
        showTypingIndicator(false);
        addCoachMessage('Neue Aufgabe hinzugefügt: "' + text + '". Ich habe sie als "' + priorityLabel[priority] + '" eingestuft und in deinen Tagesplan integriert. Ich habe auch direkt passende Teilschritte für dich vorbereitet (klicke auf "Zerlegen"!).');
    }, 800);
}

// ========== DASHBOARD STATS ==========
function updateDashboardStats() {
    let totalMicro = 0;
    let completedMicro = 0;
    
    inboxTasks.forEach(task => {
        if (task.decomposed && task.microtasks && task.microtasks.length > 0) {
            totalMicro += task.microtasks.length;
            completedMicro += task.microtasks.filter(s => s.completed).length;
        } else {
            totalMicro += 1;
            if (task.completed) completedMicro += 1;
        }
    });

    const statsText = document.getElementById('dashboard-task-progress-text');
    if (statsText) statsText.innerText = completedMicro + ' / ' + totalMicro;
}

// ========== ACTIVATION IMPULSES AND TIMER ==========
function triggerDirectImpulse() {
    setImpulseMode('freeze');
    rollImpulse();
}

function setImpulseMode(mode) {
    state.currentImpulseMode = mode;
    
    // Hide feedback area when switching modes
    const feedbackArea = document.getElementById('impulse-feedback-area');
    if (feedbackArea) feedbackArea.style.display = 'none';
    const controlButtons = document.getElementById('impulse-control-buttons');
    if (controlButtons) controlButtons.style.display = 'flex';

    // Update active tab buttons in HTML
    document.querySelectorAll('.impulse-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('tab-mode-' + mode);
    if (activeBtn) activeBtn.classList.add('active');

    // Update class on widget container for styling
    const widget = document.getElementById('impulse-widget');
    if (widget) {
        widget.classList.remove('freeze', 'hyperfocus');
        widget.classList.add(mode);
    }

    // Set durations and details
    let desc = '';
    let duration = 60;
    let initialPrompt = '';

    if (mode === 'freeze') {
        desc = 'Gegen Prokrastination und geistige Lähmung. Kurze körperliche Aktivierung für einen schnellen Dopamin-Kick.';
        duration = 60; // 1 min
        initialPrompt = 'Lass uns deinen Freeze-Zustand brechen! Klicke auf "Start" oder würfle eine andere Idee.';
    } else if (mode === 'hyperfocus') {
        desc = 'Sanfter Übergang aus dem Tunnel. Hilft dir, rechtzeitig aufzuhören und den Kopf für Neues frei zu bekommen.';
        duration = 120; // 2 min
        initialPrompt = 'Fokus-Tunnel behutsam abbauen: Bereite den Ausstieg vor und klicke auf "Start".';
    }
    state.maxTimerSeconds = duration;
    state.timerSecondsLeft = duration;
    state.currentImpulse = '';
    
    document.getElementById('impulse-mode-desc').innerText = desc;
    document.getElementById('impulse-prompt').innerText = initialPrompt;
    
    resetTimer();
}

// Roll impulse based on current mode
function rollImpulse() {
    let mode = state.currentImpulseMode || 'freeze';
    let list = IMPULSES_FREEZE;
    if (mode === 'hyperfocus') list = IMPULSES_HYPERFOCUS;

    let newImpulse = list[Math.floor(Math.random() * list.length)];
    while (newImpulse === state.currentImpulse && list.length > 1) {
        newImpulse = list[Math.floor(Math.random() * list.length)];
    }
    state.currentImpulse = newImpulse;
    document.getElementById('impulse-prompt').innerText = state.currentImpulse;
    
    // Reset timer to full duration for this mode
    resetTimer();

    showTypingIndicator(true);
    setTimeout(() => {
        showTypingIndicator(false);
        let modeLabel = 'Aktivierung (Freeze-Breaker)';
        if (mode === 'hyperfocus') modeLabel = 'Ausstieg (Hyperfokus-Stopper)';
        
        addCoachMessage('Impuls für ' + modeLabel + ' gewürfelt: "' + state.currentImpulse + '" – Starte den Timer und zieh es durch!');
    }, 1000);
}

function toggleTimer() {
    if (state.timerRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (!state.currentImpulse) {
        // Roll an impulse silently if none is selected
        let mode = state.currentImpulseMode || 'freeze';
        let list = IMPULSES_FREEZE;
        if (mode === 'hyperfocus') list = IMPULSES_HYPERFOCUS;
        state.currentImpulse = list[Math.floor(Math.random() * list.length)];
        document.getElementById('impulse-prompt').innerText = state.currentImpulse;
    }
    
    state.timerRunning = true;
    document.getElementById('timer-btn-text').innerText = 'Pause';
    const icon = document.getElementById('timer-btn-icon');
    if (icon) {
        icon.setAttribute('data-lucide', 'pause');
    }
    lucide.createIcons();
    
    playSound('start');

    state.timerInterval = setInterval(() => {
        state.timerSecondsLeft--;
        updateTimerDisplay();
        
        // Play subtle tick sound to anchor focus
        if (state.timerSecondsLeft > 0) {
            playSound('tick');
        }
        
        if (state.timerSecondsLeft <= 0) {
            timerFinished();
        }
    }, 1000);
}

function pauseTimer() {
    state.timerRunning = false;
    clearInterval(state.timerInterval);
    document.getElementById('timer-btn-text').innerText = 'Fortsetzen';
    const icon = document.getElementById('timer-btn-icon');
    if (icon) {
        icon.setAttribute('data-lucide', 'play');
    }
    lucide.createIcons();
    playSound('click');
}

function resetTimer() {
    state.timerRunning = false;
    clearInterval(state.timerInterval);
    state.timerSecondsLeft = state.maxTimerSeconds || 60;
    updateTimerDisplay();
    document.getElementById('timer-btn-text').innerText = 'Start';
    const icon = document.getElementById('timer-btn-icon');
    if (icon) {
        icon.setAttribute('data-lucide', 'play');
    }
    lucide.createIcons();
}

function updateTimerDisplay() {
    const mins = Math.floor(state.timerSecondsLeft / 60);
    const secs = state.timerSecondsLeft % 60;
    document.getElementById('timer-display').innerText =
        mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
    const progressFill = document.getElementById('timer-progress');
    if (progressFill) {
        const max = state.maxTimerSeconds || 60;
        const offset = 327 - (327 * (max - state.timerSecondsLeft) / max);
        progressFill.style.strokeDashoffset = offset;
    }
}

function timerFinished() {
    resetTimer();
    playSound('success');
    showImpulseFeedback();
}

function showImpulseFeedback() {
    const feedbackArea = document.getElementById('impulse-feedback-area');
    const controlButtons = document.getElementById('impulse-control-buttons');
    const optionsContainer = document.getElementById('feedback-options-container');
    if (!feedbackArea || !controlButtons || !optionsContainer) return;

    controlButtons.style.display = 'none';
    feedbackArea.style.display = 'block';
    optionsContainer.innerHTML = '';

    const mode = state.currentImpulseMode || 'freeze';

    if (mode === 'freeze') {
        optionsContainer.innerHTML = 
            '<button class="feedback-btn primary-action" onclick="handleImpulseFeedback(\'reactivated\')">Ich bin reaktiviert! ⚡</button>' +
            '<button class="feedback-btn secondary-action" onclick="handleImpulseFeedback(\'still_frozen\')">Immer noch blockiert ❄️</button>';
    } else if (mode === 'hyperfocus') {
        optionsContainer.innerHTML = 
            '<button class="feedback-btn primary-action" onclick="handleImpulseFeedback(\'transitioned\')">Übergang geschafft! 🎯</button>' +
            '<button class="feedback-btn secondary-action" onclick="handleImpulseFeedback(\'still_in_tunnel\')">Immer noch im Tunnel 🌀</button>';
    }
}

function handleImpulseFeedback(feedbackType) {
    playSound('click');
    
    // Hide feedback area, show control buttons
    const feedbackArea = document.getElementById('impulse-feedback-area');
    const controlButtons = document.getElementById('impulse-control-buttons');
    if (feedbackArea) feedbackArea.style.display = 'none';
    if (controlButtons) controlButtons.style.display = 'flex';

    // Reset prompt text
    let promptText = 'Wähle einen Modus und klicke auf "Start" oder würfle eine andere Idee!';
    if (state.currentImpulseMode === 'freeze') {
        promptText = 'Lass uns deinen Freeze-Zustand brechen! Klicke auf "Start" oder würfle eine andere Idee.';
    } else if (state.currentImpulseMode === 'hyperfocus') {
        promptText = 'Fokus-Tunnel behutsam abbauen: Bereite den Ausstieg vor und klicke auf "Start".';
    }
    document.getElementById('impulse-prompt').innerText = promptText;

    // Reset timer
    resetTimer();

    // Trigger AI Copilot Response
    showTypingIndicator(true);
    setTimeout(() => {
        showTypingIndicator(false);
        let coachMsg = '';
        if (feedbackType === 'reactivated') {
            coachMsg = 'Super! Du hast die Blockade durchbrochen. Nutze diese frische Energie direkt für deine wichtigste Aufgabe im Tagesplan!';
        } else if (feedbackType === 'still_frozen') {
            coachMsg = 'Das ist völlig okay. Sei geduldig mit dir. Probiere einen anderen Aktivierungs-Impuls oder schreibe mir hier im Chat, was dich gerade blockiert. Wir brechen es in noch kleinere Stücke!';
        } else if (feedbackType === 'transitioned') {
            coachMsg = 'Klasse! Den Hyperfokus bewusst zu beenden und die Aufgabe loszulassen ist eine echte Superkraft. Nimm dir kurz 2 Minuten ohne Bildschirm, bevor du etwas Neues startest.';
        } else if (feedbackType === 'still_in_tunnel') {
            coachMsg = 'Ich verstehe. Der Tunnel zieht verdammt stark. Versuche, dir einen physischen Wecker am anderen Ende des Raums zu stellen oder lüfte das Zimmer komplett durch, um den Zustand zu unterbrechen.';
        }
        addCoachMessage(coachMsg);
        
        // Also open chat to make it visible
        const container = document.querySelector('.app-container');
        if (container && container.classList.contains('collapsed-right')) {
            toggleRightSidebar();
        }
    }, 1000);
}

// ========== PROACTIVE ADHD STATE SIMULATION ==========
function simulateState(mode) {
    playSound('start');

    const overlay = document.getElementById('proactive-overlay');
    if (!overlay) return;

    // Reset classes
    overlay.className = 'proactive-overlay ' + mode;

    let badgeText = '';
    let titleText = '';
    let bodyText = '';
    let iconHTML = '';
    let list = [];

    if (mode === 'freeze') {
        badgeText = 'Aktivität gefordert (Freeze-Zustand)';
        titleText = 'ADHS-Paralyse erkannt ❄️';
        bodyText = 'Unser System hat festgestellt, dass du dich seit 30 Minuten auf dem Dashboard aufhältst, ohne eine Aufgabe zu bearbeiten. Lass uns die Blockade mit einem kurzen physischen Impuls brechen!';
        iconHTML = '<i data-lucide="snowflake"></i>';
        list = IMPULSES_FREEZE;
    } else if (mode === 'hyperfocus') {
        badgeText = 'Fokus-Kontrolle (Hyperfokus-Warnung)';
        titleText = 'Achtung: Hyperfokus-Tunnel 🌀';
        bodyText = 'Du arbeitest seit über 90 Minuten durchgehend an deiner Präsentation. Um einen Erschöpfungs-Crash am Nachmittag zu verhindern, solltest du den Tunnel jetzt für 2 Minuten kontrolliert abbauen!';
        iconHTML = '<i data-lucide="orbit"></i>';
        list = IMPULSES_HYPERFOCUS;
    }
    const impulseText = list[Math.floor(Math.random() * list.length)];

    document.getElementById('proactive-badge-text').innerText = badgeText;
    document.getElementById('proactive-title-text').innerText = titleText;
    document.getElementById('proactive-body-text').innerText = bodyText;
    document.getElementById('proactive-impulse-text').innerText = impulseText;
    
    const iconContainer = document.getElementById('proactive-icon-container');
    if (iconContainer) iconContainer.innerHTML = iconHTML;

    // Connect accept button
    const acceptBtn = document.getElementById('proactive-accept-btn');
    if (acceptBtn) {
        acceptBtn.onclick = () => {
            acceptProactiveImpulse(mode, impulseText);
        };
    }

    // Show/hide the "Später erinnern" button based on mode (no postponement for hyperfocus or pause)
    const declineBtn = document.getElementById('proactive-decline-btn');
    if (declineBtn) {
        if (mode === 'freeze') {
            declineBtn.style.display = 'block';
        } else {
            declineBtn.style.display = 'none';
        }
    }

    overlay.style.display = 'flex';
    lucide.createIcons();
}

function closeProactiveOverlay() {
    playSound('click');
    const overlay = document.getElementById('proactive-overlay');
    if (overlay) overlay.style.display = 'none';

    showTypingIndicator(true);
    setTimeout(() => {
        showTypingIndicator(false);
        addCoachMessage('In Ordnung, ich erinnere dich in 5 Minuten wieder daran. Bitte vergiss nicht, auf deine Energie zu achten!');
    }, 1000);
}

function acceptProactiveImpulse(mode, impulseText) {
    playSound('click');
    const overlay = document.getElementById('proactive-overlay');
    if (overlay) overlay.style.display = 'none';

    // Switch tab to routines
    switchTab('routines');

    // Set mode
    setImpulseMode(mode);

    // Load rolled impulse
    state.currentImpulse = impulseText;
    document.getElementById('impulse-prompt').innerText = impulseText;

    // Start timer automatically
    startTimer();
}

// ========== RETROSPECTIVE WIZARD ==========
function selectRetroEmoji(step, element, label) {
    const parent = element.parentElement;
    parent.querySelectorAll('.emoji-btn').forEach(btn => btn.classList.remove('selected'));
    element.classList.add('selected');
    state.retroData.focusMood = label;
    document.getElementById('retro-emoji-label-1').innerText = 'Ausgewählt: ' + label;
    playSound('click');
}

function nextRetroStep(stepNum) {
    if (stepNum === 2 && !state.retroData.focusMood) {
        alert('Bitte wähle zuerst ein Smiley aus!');
        return;
    }
    playSound('click');
    document.querySelectorAll('.retro-step').forEach(step => step.classList.remove('active'));
    document.getElementById('retro-step-' + stepNum).classList.add('active');

    document.querySelectorAll('.retro-dot').forEach((dot, idx) => {
        dot.classList.remove('active');
        if (idx < stepNum - 1) {
            dot.classList.add('completed');
        } else if (idx === stepNum - 1) {
            dot.classList.add('active');
            dot.classList.remove('completed');
        } else {
            dot.classList.remove('completed');
        }
    });
    state.retroStep = stepNum;
}

function toggleRetroBehavior(element, toolName) {
    element.classList.toggle('completed');
    playSound('click');
    const idx = state.retroData.helpfulTools.indexOf(toolName);
    if (idx > -1) {
        state.retroData.helpfulTools.splice(idx, 1);
    } else {
        state.retroData.helpfulTools.push(toolName);
    }
}

function finishRetro() {
    state.retroData.reflectionText = document.getElementById('retro-text-input').value.trim();
    playSound('success');

    let recommendedTip = 'Konzentriere dich nächste Woche darauf, Aufgaben direkt morgens in Microtasks zu zerlegen.';
    if (state.retroData.helpfulTools.includes('Impulserinnerung')) {
        recommendedTip = 'Aktiviere dich zwischendurch mit dem 1-Minuten-Timer, wenn dein Fokus nachlässt.';
    } else if (state.retroData.helpfulTools.includes('Visual Deadlines')) {
        recommendedTip = 'Nutze visuelle Countdowns im Dashboard, um deiner Zeitblindheit gezielt entgegenzuwirken.';
    }

    document.getElementById('retro-summary-tip').innerText = recommendedTip;
    nextRetroStep(4);

    showTypingIndicator(true);
    setTimeout(() => {
        showTypingIndicator(false);
        addCoachMessage('Retrospektive erfolgreich abgeschlossen! Dein Fokus-Tipp für nächste Woche lautet: "' + recommendedTip + '" – ich werde dich daran erinnern!');
    }, 1200);
}

function resetRetroWizard() {
    playSound('click');
    state.retroData = { focusMood: '', reflectionText: '', helpfulTools: [] };
    document.getElementById('retro-text-input').value = '';
    document.getElementById('retro-emoji-label-1').innerText = '';
    document.querySelectorAll('.retro-emoji-selector .emoji-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('#retro-step-3 .checklist-item').forEach(item => item.classList.remove('completed'));
    nextRetroStep(1);
}

// ========== AI COACH CHATBOT SIMULATION ==========
function showTypingIndicator(show) {
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) {
        if (show) {
            indicator.style.display = 'flex';
            scrollToBottom();
        } else {
            indicator.style.display = 'none';
        }
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages-container');
    if (container) container.scrollTop = container.scrollHeight;
}

function addCoachMessage(text) {
    const container = document.getElementById('chat-messages-container');
    const indicator = document.getElementById('chat-typing-indicator');
    if (!container || !indicator) return;
    
    const msg = document.createElement('div');
    msg.className = 'chat-message coach';
    msg.innerHTML = '<div class="message-bubble">' + text + '</div><span class="message-time">Gerade eben</span>';
    container.insertBefore(msg, indicator);
    scrollToBottom();
}

function addUserMessage(text) {
    const container = document.getElementById('chat-messages-container');
    const indicator = document.getElementById('chat-typing-indicator');
    if (!container || !indicator) return;

    const msg = document.createElement('div');
    msg.className = 'chat-message user';
    msg.innerHTML = '<div class="message-bubble">' + text + '</div><span class="message-time">Gerade eben</span>';
    container.insertBefore(msg, indicator);
    scrollToBottom();
}

function sendUserMessage() {
    const input = document.getElementById('chat-message-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    
    addUserMessage(text);
    input.value = '';
    playSound('click');
    processCoachResponse(text);
}

function handleSuggestion(suggestion) {
    addUserMessage(suggestion);
    playSound('click');
    processCoachResponse(suggestion);
}

function processCoachResponse(userText) {
    showTypingIndicator(true);
    const query = userText.toLowerCase();
    let reply = '';
    let tabTarget = '';

    setTimeout(() => {
        showTypingIndicator(false);

        if (query.includes('tagesstart') || query.includes('tagesplan') || query.includes('planen') || query.includes('struktur') || query.includes('aufgabe') || query.includes('task') || query.includes('zerlegen')) {
            reply = 'Ich habe deinen Tagesplan geöffnet. Dort siehst du deine anstehenden Aufgaben. Klicke bei einer Aufgabe auf "Zerlegen", um sie in kleine Schritte aufzuteilen!';
            tabTarget = 'microtasks';
        } else if (query.includes('impuls') || query.includes('aktivier') || query.includes('motivation') || query.includes('block') || query.includes('timer')) {
            reply = 'Ich habe das Impulse-Panel geöffnet. Lass uns dein Gehirn mit einem passenden Impuls in Schwung bringen. Klicke auf "Neu würfeln" oder starte direkt!';
            tabTarget = 'routines';
        } else if (query.includes('retro') || query.includes('woche') || query.includes('reflek') || query.includes('rückblick')) {
            reply = 'Zeit für den Rückblick! Ich habe die Retrospektive geöffnet. Lass uns gemeinsam reflektieren und lernen.';
            tabTarget = 'retro';
        } else if (query.includes('hallo') || query.includes('hi') || query.includes('hey') || query.includes('hallo copilot')) {
            reply = 'Hallo Alex! Wie kann ich dir heute helfen? Möchtest du deinen Tagesplan ansehen oder brauchst du einen schnellen Aktivierungsimpuls?';
        } else if (query.includes('danke') || query.includes('super') || query.includes('cool') || query.includes('danke dir')) {
            reply = 'Sehr gerne! Ich bin immer da, um dir den Rücken freizuhalten. Lass uns fokussiert bleiben!';
        } else {
            reply = 'Als dein ADHS-Copilot empfehle ich dir: Schau in deinen priorisierten Tagesplan, zerlege eine Aufgabe in Teilschritte oder mache einen kurzen 1-Minuten-Impuls gegen Prokrastination.';
        }

        addCoachMessage(reply);
        if (tabTarget) switchTab(tabTarget);
    }, 1000);
}

// ========== SIDEBAR TOGGLE FUNCTIONS ==========
function toggleLeftSidebar() {
    const container = document.querySelector('.app-container');
    if (!container) return;
    container.classList.toggle('collapsed-left');
    
    const btn = document.getElementById('toggle-left-btn');
    if (btn) {
        const isCollapsed = container.classList.contains('collapsed-left');
        btn.classList.toggle('active', isCollapsed);
    }
    
    playSound('click');
}

function toggleRightSidebar() {
    const container = document.querySelector('.app-container');
    if (!container) return;
    container.classList.toggle('collapsed-right');
    
    const btn = document.getElementById('toggle-right-btn');
    if (btn) {
        const isCollapsed = container.classList.contains('collapsed-right');
        btn.classList.toggle('active', isCollapsed);
    }
    
    playSound('click');
}

// ========== INTERACTIVE CHART TOOLTIPS ==========
function setupChartTooltips() {
    const tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) return;

    const elements = document.querySelectorAll('.chart-bar, .chart-dot');
    elements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const val = el.getAttribute('data-val');
            tooltip.innerText = val;
            tooltip.style.display = 'block';
            
            // Position tooltip relative to container
            const container = document.querySelector('.chart-container');
            if (container) {
                const rect = container.getBoundingClientRect();
                const x = e.clientX - rect.left + 10;
                const y = e.clientY - rect.top - 35;
                
                tooltip.style.left = x + 'px';
                tooltip.style.top = y + 'px';
            }
        });
        
        el.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

// ========== COLLAPSIBLE CARDS ==========
function toggleCardCollapse(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle('collapsed');
    playSound('click');
}

function triggerQuickImpulse(mode) {
    playSound('click');
    switchTab('routines');
    setImpulseMode(mode);
    rollImpulse();
    startTimer();
}
