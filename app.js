// --- アプリケーションの状態管理 ---
const appState = {
    players: [], // { name, playerClass, playerGroup, floor, vault, bars, beam, total }
    ui: {
        totalRankClass: 'C',
        eventRankClass: 'C',
        eventRankEvent: 'floor',
    }
};

// --- DOM要素のキャッシュ ---
const dom = {};
function cacheDOMElements() {
    const ids = [
        'csvInput', 'csvUploadBtn', 'inputClassSelect', 'inputGroupSelect',
        'inputPlayersArea', 'inputScoreSubmitBtn', 'totalRankTabs', 'eventRankTabs',
        'eventSelect', 'eventRankingList', 'printBtn',
        'totalRankContent_C', 'totalRankContent_B', 'totalRankContent_A',
        'classC_playersTable', 'classB_playersTable', 'classA_playersTable'
    ];
    ids.forEach(id => dom[id] = document.getElementById(id));
}


// --- 初期化処理 ---
document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    setupEventListeners();
    loadData(); // ローカルストレージからデータを読み込む
    renderAll();
});

function setupEventListeners() {
    // 印刷ボタン
    dom.printBtn.addEventListener('click', () => window.print());

    // CSV読み込み
    dom.csvUploadBtn.addEventListener('click', handleCsvUpload);

    // 点数手動入力
    dom.inputClassSelect.addEventListener('change', () => {
        renderGroupOptions();
        renderInputPlayersArea();
    });
    dom.inputGroupSelect.addEventListener('change', renderInputPlayersArea);
    dom.inputScoreSubmitBtn.addEventListener('click', handleSubmitScores);

    // Enterキーで次の入力欄へ移動
    dom.inputPlayersArea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') {
            return;
        }
        e.preventDefault(); // フォームの送信など、Enterキーのデフォルト動作をキャンセル

        const currentInput = e.target;
        const currentEvent = currentInput.dataset.event;

        // 表示されているすべての入力欄を取得
        const allInputs = Array.from(dom.inputPlayersArea.querySelectorAll('input[type="number"]'));
        const currentIndex = allInputs.indexOf(currentInput);

        // 次の同じ種目の入力欄を探す
        for (let i = currentIndex + 1; i < allInputs.length; i++) {
            if (allInputs[i].dataset.event === currentEvent) {
                allInputs[i].focus();
                return; // 次の入力欄にフォーカスしたら処理を終了
            }
        }
    });

    // 総合ランキングのタブ
    dom.totalRankTabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            appState.ui.totalRankClass = e.target.dataset.class;
            renderTotalRanking();
        }
    });

    // 種目別ランキングのタブ
    dom.eventRankTabs.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            appState.ui.eventRankClass = e.target.dataset.class;
            renderEventRanking();
        }
    });

    // 種目別ランキングのドロップダウン
    dom.eventSelect.addEventListener('change', (e) => {
        appState.ui.eventRankEvent = e.target.value;
        renderEventRanking();
    });
}

// --- データ処理 ---
function handleCsvUpload() {
    if (!dom.csvInput.files.length) {
        alert('CSVファイルを選択してください');
        return;
    }
    const file = dom.csvInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        parseCSV(e.target.result);
        saveData(); // データを保存
        renderAll();
        alert(`${appState.players.length}名の選手データを読み込みました。`);
    };
    reader.readAsText(file, 'UTF-8');
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).slice(1); // ヘッダー行を除外
    appState.players = lines.map(line => {
        const cols = line.split(',');
        if (cols.length < 8) return null;

        const playerClass = cols[0].trim();
        let playerGroup = cols[1].trim();
        if (/^\d+$/.test(playerGroup)) playerGroup += '組';
        const name = cols[3].trim();
        const floor = parseFloat(cols[4]) || 0;
        const vault = parseFloat(cols[5]) || 0;
        const bars = parseFloat(cols[6]) || 0;
        const beam = parseFloat(cols[7]) || 0;

        if (!name || !playerClass || !playerGroup) return null;

        return { name, playerClass, playerGroup, floor, vault, bars, beam, total: floor + vault + bars + beam };
    }).filter(p => p !== null); // 不正な行を除外

    dom.csvInput.value = '';
}

function handleSubmitScores() {
    const inputs = dom.inputPlayersArea.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        const index = parseInt(input.dataset.index, 10);
        const event = input.dataset.event;
        const value = parseFloat(input.value) || 0;
        if (!isNaN(index) && event && appState.players[index]) {
            appState.players[index][event] = value;
        }
    });

    // 合計点を再計算
    appState.players.forEach(p => {
        p.total = (p.floor || 0) + (p.vault || 0) + (p.bars || 0) + (p.beam || 0);
    });

    saveData(); // データを保存
    renderAll();
    alert('点数を登録しました');
}

// --- データ永続化 (LocalStorage) ---
function saveData() {
    localStorage.setItem('gymnasticsScoreData', JSON.stringify(appState.players));
}

function loadData() {
    const data = localStorage.getItem('gymnasticsScoreData');
    if (data) {
        appState.players = JSON.parse(data);
    }
}

// --- 描画処理 ---
function renderAll() {
    renderGroupOptions();
    renderInputPlayersArea();
    renderTotalRanking();
    renderEventRanking();
}

function renderGroupOptions() {
    const classVal = dom.inputClassSelect.value;
    const groups = [...new Set(appState.players.filter(p => p.playerClass === classVal).map(p => p.playerGroup))].sort();

    dom.inputGroupSelect.innerHTML = '';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        dom.inputGroupSelect.appendChild(option);
    });
}

function renderInputPlayersArea() {
    const classVal = dom.inputClassSelect.value;
    const groupVal = dom.inputGroupSelect.value;
    const filteredPlayers = appState.players.map((p, i) => ({...p, originalIndex: i}))
                                        .filter(p => p.playerClass === classVal && p.playerGroup === groupVal);

    if (filteredPlayers.length === 0) {
        dom.inputPlayersArea.innerHTML = '<div style="color:#888;">該当選手がいません</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredPlayers.forEach(p => {
        const playerDiv = document.createElement('div');
        playerDiv.style.cssText = 'display:flex; align-items:center; gap:1em; margin-bottom:0.5em; flex-wrap: wrap;';
        playerDiv.innerHTML = `
            <span style='min-width:8em;'>${p.name}</span>
            <span>床: <input type='number' min='0' step='0.001' value='${p.floor|| ""}' data-event='floor' data-index='${p.originalIndex}' style='width:5em;'></span>
            <span>跳馬: <input type='number' min='0' step='0.001' value='${p.vault|| ""}' data-event='vault' data-index='${p.originalIndex}' style='width:5em;'></span>
            <span>段違い: <input type='number' min='0' step='0.001' value='${p.bars|| ""}' data-event='bars' data-index='${p.originalIndex}' style='width:5em;'></span>
            <span>平均台: <input type='number' min='0' step='0.001' value='${p.beam|| ""}' data-event='beam' data-index='${p.originalIndex}' style='width:5em;'></span>
        `;
        fragment.appendChild(playerDiv);
    });
    dom.inputPlayersArea.innerHTML = '';
    dom.inputPlayersArea.appendChild(fragment);
}

function renderTotalRanking() {
    const selectedClass = appState.ui.totalRankClass;

    // タブのアクティブ状態を更新
    dom.totalRankTabs.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.class === selectedClass);
    });
    // C, B, Aクラス全てのランキングコンテンツを一度取得し、IDが一致するものだけをアクティブにする
    ['C', 'B', 'A'].forEach(cls => {
        const contentDiv = dom[`totalRankContent_${cls}`];
        if (contentDiv) contentDiv.classList.toggle('active', cls === selectedClass);
    });

    // テーブルを更新
    const table = dom[`class${selectedClass}_playersTable`];
    if (!table) return;
    const tbody = table.querySelector('tbody');

    const sortedPlayers = appState.players
        .map((p, i) => ({ ...p, originalIndex: i }))
        .filter(p => p.playerClass === selectedClass)
        .sort((a, b) => b.total - a.total);

    tbody.innerHTML = '';
    const fragment = document.createDocumentFragment();
    sortedPlayers.forEach((p, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i + 1}</td>
            <td>${p.name}</td>
            <td>${p.playerGroup}</td>
            <td>${p.total.toFixed(3)}</td>
            <td><button type="button" onclick="alert('編集機能は現在準備中です')">編集</button></td>
        `;
        fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);
}

function renderEventRanking() {
    const selectedClass = appState.ui.eventRankClass;
    const selectedEvent = appState.ui.eventRankEvent;

    // タブのアクティブ状態を更新
    dom.eventRankTabs.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.class === selectedClass);
    });

    // ランキングリストを更新
    const sortedPlayers = appState.players
        .filter(p => p.playerClass === selectedClass)
        .sort((a, b) => (b[selectedEvent] || 0) - (a[selectedEvent] || 0));

    dom.eventRankingList.innerHTML = '';
    const fragment = document.createDocumentFragment();
    sortedPlayers.forEach((p, i) => { // 全員を表示
        const li = document.createElement('li');
        li.textContent = `${i + 1}位: ${p.name} (${(p[selectedEvent] || 0).toFixed(3)})`;
        fragment.appendChild(li);
    });
    dom.eventRankingList.appendChild(fragment);
}
