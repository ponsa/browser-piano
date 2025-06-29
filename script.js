class Piano {
            constructor() {
                this.audioContext = null;
                this.currentOctave = 4;
                this.activeNotes = new Set();
                this.keys = [];
                this.metronomeInterval = null;
                this.isMetronomeRunning = false;
                this.bpm = 120;
                this.metronomeVolume = 0.5;
                this.beatCount = 0;
                this.timeSignature = 4; // 4/4拍子がデフォルト
                this.accentEnabled = true; // 1拍目強調をデフォルトでオン
                this.keyMapping = {
                    // 1オクターブ目
                    'KeyA': { note: 'C', octave: 0 },
                    'KeyW': { note: 'C#', octave: 0 },
                    'KeyS': { note: 'D', octave: 0 },
                    'KeyE': { note: 'D#', octave: 0 },
                    'KeyD': { note: 'E', octave: 0 },
                    'KeyF': { note: 'F', octave: 0 },
                    'KeyT': { note: 'F#', octave: 0 },
                    'KeyG': { note: 'G', octave: 0 },
                    'KeyY': { note: 'G#', octave: 0 },
                    'KeyH': { note: 'A', octave: 0 },
                    'KeyU': { note: 'A#', octave: 0 },
                    'KeyJ': { note: 'B', octave: 0 },
                    // 2オクターブ目
                    'KeyK': { note: 'C', octave: 1 },
                    'KeyO': { note: 'C#', octave: 1 },
                    'KeyL': { note: 'D', octave: 1 },
                    'KeyP': { note: 'D#', octave: 1 },
                    'Semicolon': { note: 'E', octave: 1 },
                    'Quote': { note: 'F', octave: 1 },
                    'BracketRight': { note: 'F#', octave: 1 },
                    'Enter': { note: 'G', octave: 1 },
                    'Backslash': { note: 'G#', octave: 1 },
                    // 最高音のC
                    'Space': { note: 'C', octave: 2 }
                };
                
                this.init();
            }

            async init() {
                this.createPiano();
                this.setupEventListeners();
                
                // タッチデバイス対応
                document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
                document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
                document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
            }

            async initAudioContext() {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    if (this.audioContext.state === 'suspended') {
                        await this.audioContext.resume();
                    }
                }
            }

            createPiano() {
                const piano = document.getElementById('piano');
                const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
                
                // 2オクターブ分の鍵盤を作成
                for (let octave = 0; octave < 2; octave++) {
                    // 白鍵を作成
                    whiteNotes.forEach((note, index) => {
                        const key = document.createElement('div');
                        key.className = 'key white-key';
                        key.dataset.note = note;
                        key.dataset.octave = octave;
                        key.innerHTML = `<div>${note}${octave + this.currentOctave}</div>`;
                        
                        key.addEventListener('mousedown', (e) => {
                            e.preventDefault();
                            this.playNote(note, this.currentOctave + octave);
                            key.classList.add('active');
                        });
                        
                        key.addEventListener('mouseup', () => {
                            this.stopNote(note, this.currentOctave + octave);
                            key.classList.remove('active');
                        });
                        
                        key.addEventListener('mouseleave', () => {
                            this.stopNote(note, this.currentOctave + octave);
                            key.classList.remove('active');
                        });
                        
                        piano.appendChild(key);
                        this.keys.push({ element: key, note: note, octave: octave, type: 'white' });
                    });
                }
                
                // 最高音のC（3オクターブ目の開始音）を追加
                const highestC = document.createElement('div');
                highestC.className = 'key white-key';
                highestC.dataset.note = 'C';
                highestC.dataset.octave = '2';
                highestC.innerHTML = `<div>C${this.currentOctave + 2}</div>`;
                
                highestC.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    this.playNote('C', this.currentOctave + 2);
                    highestC.classList.add('active');
                });
                
                highestC.addEventListener('mouseup', () => {
                    this.stopNote('C', this.currentOctave + 2);
                    highestC.classList.remove('active');
                });
                
                highestC.addEventListener('mouseleave', () => {
                    this.stopNote('C', this.currentOctave + 2);
                    highestC.classList.remove('active');
                });
                
                piano.appendChild(highestC);
                this.keys.push({ element: highestC, note: 'C', octave: 2, type: 'white' });
                
                // 黒鍵を作成（白鍵の間に配置）
                const blackKeyPattern = [1, 1, 0, 1, 1, 1, 0]; // C#, D#, -, F#, G#, A#, -
                const blackNoteNames = ['C#', 'D#', '', 'F#', 'G#', 'A#', ''];
                
                for (let octave = 0; octave < 2; octave++) {
                    blackKeyPattern.forEach((hasBlackKey, index) => {
                        if (hasBlackKey) {
                            const note = blackNoteNames[index];
                            const key = document.createElement('div');
                            key.className = 'key black-key';
                            key.dataset.note = note;
                            key.dataset.octave = octave;
                            key.innerHTML = `<div>${note}${octave + this.currentOctave}</div>`;
                            
                            // 黒鍵の位置を計算（白鍵の境界に配置）
                            const whiteKeyWidth = 50.5; // width + margin
                            const leftOffset = (octave * 7 + index) * whiteKeyWidth + (whiteKeyWidth * 0.7);
                            key.style.left = `${leftOffset}px`;
                            
                            key.addEventListener('mousedown', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this.playNote(note, this.currentOctave + octave);
                                key.classList.add('active');
                            });
                            
                            key.addEventListener('mouseup', (e) => {
                                e.stopPropagation();
                                this.stopNote(note, this.currentOctave + octave);
                                key.classList.remove('active');
                            });
                            
                            key.addEventListener('mouseleave', () => {
                                this.stopNote(note, this.currentOctave + octave);
                                key.classList.remove('active');
                            });
                            
                            piano.appendChild(key);
                            this.keys.push({ element: key, note: note, octave: octave, type: 'black' });
                        }
                    });
                }
            }

            setupEventListeners() {
                // キーボード操作
                document.addEventListener('keydown', (e) => {
                    if (this.keyMapping[e.code] && !this.activeNotes.has(e.code)) {
                        e.preventDefault();
                        const keyData = this.keyMapping[e.code];
                        const note = keyData.note;
                        const octave = this.currentOctave + keyData.octave;
                        this.playNote(note, octave);
                        this.activeNotes.add(e.code);
                        this.highlightKey(note, keyData.octave, true);
                    }
                });
                
                document.addEventListener('keyup', (e) => {
                    if (this.keyMapping[e.code]) {
                        e.preventDefault();
                        const keyData = this.keyMapping[e.code];
                        const note = keyData.note;
                        const octave = this.currentOctave + keyData.octave;
                        this.stopNote(note, octave);
                        this.activeNotes.delete(e.code);
                        this.highlightKey(note, keyData.octave, false);
                    }
                });
                
                // オクターブ制御
                document.getElementById('octaveUp').addEventListener('click', () => {
                    if (this.currentOctave < 5) { // 最高音C7まで対応
                        this.currentOctave++;
                        this.updateOctaveDisplay();
                        this.updateKeyLabels();
                    }
                });
                
                // メトロノーム制御
                document.getElementById('metronomeToggle').addEventListener('click', () => {
                    this.toggleMetronome();
                });
                
                document.getElementById('bpmInput').addEventListener('input', (e) => {
                    this.bpm = parseInt(e.target.value);
                    if (this.isMetronomeRunning) {
                        this.stopMetronome();
                        this.startMetronome();
                    }
                });
                
                document.getElementById('volumeSlider').addEventListener('input', (e) => {
                    this.metronomeVolume = parseInt(e.target.value) / 100;
                });
                
                document.getElementById('timeSignatureSelect').addEventListener('change', (e) => {
                    this.timeSignature = parseInt(e.target.value);
                    this.beatCount = 0; // 拍子変更時にビートカウントをリセット
                });
                
                document.getElementById('accentToggle').addEventListener('click', () => {
                    this.toggleAccent();
                });
                
                document.getElementById('octaveDown').addEventListener('click', () => {
                    if (this.currentOctave > 1) {
                        this.currentOctave--;
                        this.updateOctaveDisplay();
                        this.updateKeyLabels();
                    }
                });
            }

            handleTouchStart(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                if (element && element.classList.contains('key')) {
                    const note = element.dataset.note;
                    const octave = parseInt(element.dataset.octave);
                    this.playNote(note, this.currentOctave + octave);
                    element.classList.add('active');
                }
            }

            handleTouchEnd(e) {
                e.preventDefault();
                this.keys.forEach(key => {
                    const octave = parseInt(key.element.dataset.octave);
                    this.stopNote(key.note, this.currentOctave + octave);
                    key.element.classList.remove('active');
                });
            }

            handleTouchMove(e) {
                e.preventDefault();
                const touch = e.touches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                // 全ての鍵盤を一旦停止
                this.keys.forEach(key => {
                    if (key.element.classList.contains('active')) {
                        const octave = parseInt(key.element.dataset.octave);
                        this.stopNote(key.note, this.currentOctave + octave);
                        key.element.classList.remove('active');
                    }
                });
                
                // 現在触れている鍵盤を再生
                if (element && element.classList.contains('key')) {
                    const note = element.dataset.note;
                    const octave = parseInt(element.dataset.octave);
                    this.playNote(note, this.currentOctave + octave);
                    element.classList.add('active');
                }
            }

            async playNote(note, octave = null) {
                await this.initAudioContext();
                
                const targetOctave = octave || this.currentOctave;
                const frequency = this.getFrequency(note, targetOctave);
                const noteKey = `${note}-${targetOctave}`;
                
                // オシレーターを作成
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                oscillator.type = 'triangle'; // より柔らかい音色
                
                // エンベロープ（音の立ち上がりと減衰）
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + 0.3);
                
                oscillator.start();
                
                // 音符データを保存
                if (!this.playingNotes) this.playingNotes = new Map();
                this.playingNotes.set(noteKey, { oscillator, gainNode });
            }

            stopNote(note, octave = null) {
                if (!this.playingNotes) return;
                
                const targetOctave = octave || this.currentOctave;
                const noteKey = `${note}-${targetOctave}`;
                const noteData = this.playingNotes.get(noteKey);
                if (noteData) {
                    const { oscillator, gainNode } = noteData;
                    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
                    oscillator.stop(this.audioContext.currentTime + 0.1);
                    this.playingNotes.delete(noteKey);
                }
            }

            getFrequency(note, octave) {
                // A4 = 442Hz を基準とした12平均律の計算
                // 各音のA4からの半音数
                const semitoneFromA4 = {
                    'C': -9,   // A4から9半音下
                    'C#': -8,  // A4から8半音下
                    'D': -7,   // A4から7半音下
                    'D#': -6,  // A4から6半音下
                    'E': -5,   // A4から5半音下
                    'F': -4,   // A4から4半音下
                    'F#': -3,  // A4から3半音下
                    'G': -2,   // A4から2半音下
                    'G#': -1,  // A4から1半音下
                    'A': 0,    // A4
                    'A#': 1,   // A4から1半音上
                    'B': 2     // A4から2半音上
                };
                
                // A4 = 442Hz
                const A4_FREQUENCY = 442.0;
                
                // 12平均律: 周波数 = A4 * 2^(半音数/12)
                // オクターブによる調整: octave-4 分だけオクターブシフト
                const totalSemitones = semitoneFromA4[note] + (octave - 4) * 12;
                const frequency = A4_FREQUENCY * Math.pow(2, totalSemitones / 12);
                
                // 小数点第4位まで正確に表現
                return Math.round(frequency * 10000) / 10000;
            }

            highlightKey(note, octave, active) {
                const key = this.keys.find(k => k.note === note && k.octave === octave);
                if (key) {
                    if (active) {
                        key.element.classList.add('active');
                    } else {
                        key.element.classList.remove('active');
                    }
                }
            }

            updateOctaveDisplay() {
                document.getElementById('octaveDisplay').textContent = `オクターブ: ${this.currentOctave}-${this.currentOctave + 2}`;
            }

            updateKeyLabels() {
                this.keys.forEach(key => {
                    const displayOctave = this.currentOctave + key.octave;
                    key.element.innerHTML = `<div>${key.note}${displayOctave}</div>`;
                });
            }

            toggleMetronome() {
                if (this.isMetronomeRunning) {
                    this.stopMetronome();
                } else {
                    this.startMetronome();
                }
            }

            async startMetronome() {
                await this.initAudioContext();
                this.isMetronomeRunning = true;
                this.beatCount = 1; // 1から開始（最初の音を高くするため）
                
                const toggleBtn = document.getElementById('metronomeToggle');
                toggleBtn.textContent = '⏸️';
                toggleBtn.classList.add('active');
                
                const interval = 60000 / this.bpm; // ミリ秒
                
                // 最初のクリックを即座に再生（1拍目なので高い音）
                this.playMetronomeClick();
                
                this.metronomeInterval = setInterval(() => {
                    this.beatCount++;
                    if (this.beatCount > this.timeSignature) {
                        this.beatCount = 1; // 拍子に応じてリセット
                    }
                    this.playMetronomeClick();
                }, interval);
            }

            stopMetronome() {
                this.isMetronomeRunning = false;
                
                if (this.metronomeInterval) {
                    clearInterval(this.metronomeInterval);
                    this.metronomeInterval = null;
                }
                
                const toggleBtn = document.getElementById('metronomeToggle');
                toggleBtn.textContent = '▶️';
                toggleBtn.classList.remove('active');
                
                this.beatCount = 0;
            }

            async playMetronomeClick() {
                if (!this.audioContext || this.metronomeVolume === 0) return;
                
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                
                // 1拍目強調の設定に応じて音程と音量を決定
                const isStrongBeat = this.beatCount === 1 && this.accentEnabled;
                const frequency = isStrongBeat ? 1200 : 700;
                const volume = isStrongBeat ? this.metronomeVolume * 0.4 : this.metronomeVolume * 0.25;
                const duration = isStrongBeat ? 0.15 : 0.1;
                
                // アクセントが無効の場合は全ての拍を同じ音程・音量にする
                if (!this.accentEnabled) {
                    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
                } else {
                    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
                }
                
                oscillator.type = 'square';
                
                // メトロノーム音のエンベロープ
                const finalVolume = this.accentEnabled ? volume : this.metronomeVolume * 0.3;
                const finalDuration = this.accentEnabled ? duration : 0.1;
                
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(
                    finalVolume, 
                    this.audioContext.currentTime + 0.01
                );
                gainNode.gain.exponentialRampToValueAtTime(
                    0.001, 
                    this.audioContext.currentTime + finalDuration
                );
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + finalDuration);
            }

            toggleAccent() {
                this.accentEnabled = !this.accentEnabled;
                const accentBtn = document.getElementById('accentToggle');
                
                if (this.accentEnabled) {
                    accentBtn.classList.remove('inactive');
                    accentBtn.classList.add('active');
                    accentBtn.textContent = '🔔';
                    accentBtn.title = '1拍目強調オン';
                } else {
                    accentBtn.classList.remove('active');
                    accentBtn.classList.add('inactive');
                    accentBtn.textContent = '🔕';
                    accentBtn.title = '1拍目強調オフ';
                }
            }
        }

        // ピアノを初期化
        const piano = new Piano();

        // タッチデバイスでのスクロール防止
        document.addEventListener('touchmove', function(e) {
            if (e.target.classList.contains('key')) {
                e.preventDefault();
            }
        }, { passive: false });