// PWA - LeafDiag AI Application - Fixed Version
class LeafDiagApp {
    constructor() {
        this.cv = null;
        this.isOpenCVLoaded = false;
        this.init();
    }

    async init() {
        console.log('Initializing LeafDiag AI...');
        
        // Enregistrement du Service Worker
        this.registerServiceWorker();
        
        // Initialisation des événements AVANT le chargement d'OpenCV
        this.setupEventListeners();
        
        // Chargement d'OpenCV.js
        await this.loadOpenCV();
        
        // Vérification support PWA
        this.checkPWASupport();
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('SW enregistré:', registration);
                })
                .catch((error) => {
                    console.log('SW erreur:', error);
                });
        }
    }

    async loadOpenCV() {
        this.updateStatus('🔄 Chargement OpenCV...');
        
        return new Promise((resolve, reject) => {
            // Vérifier si OpenCV est déjà chargé
            if (typeof cv !== 'undefined' && cv.Mat) {
                this.cv = cv;
                this.isOpenCVLoaded = true;
                console.log('OpenCV.js déjà chargé');
                this.updateStatus('🤖 IA prête');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/opencv.js@4.8.0/opencv.js';
            script.async = true;
            
            script.onload = () => {
                console.log('Script OpenCV chargé, attente initialisation...');
                
                // Attendre que cv soit défini globalement
                const checkOpenCV = () => {
                    if (typeof cv !== 'undefined' && cv.onRuntimeInitialized) {
                        cv.onRuntimeInitialized = () => {
                            this.cv = cv;
                            this.isOpenCVLoaded = true;
                            console.log('OpenCV.js initialisé avec succès');
                            this.updateStatus('🤖 IA prête');
                            resolve();
                        };
                    } else {
                        setTimeout(checkOpenCV, 100);
                    }
                };
                checkOpenCV();
            };
            
            script.onerror = (error) => {
                console.error('Erreur chargement OpenCV:', error);
                this.updateStatus('❌ Erreur chargement IA');
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    setupEventListeners() {
        console.log('Configuration des event listeners...');
        
        const fileInput = document.getElementById('file');
        const analyzeBtn = document.getElementById('analyze-btn');
        const refreshBtn = document.getElementById('refresh-btn');

        if (!fileInput || !analyzeBtn || !refreshBtn) {
            console.error('Éléments DOM non trouvés:', { fileInput, analyzeBtn, refreshBtn });
            return;
        }

        // Event listener pour l'input file
        fileInput.addEventListener('change', (e) => {
            console.log('Fichier sélectionné:', e.target.files);
            
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                console.log('Détails fichier:', {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
                
                // Vérification du type de fichier
                if (!file.type.startsWith('image/')) {
                    this.showError('Veuillez sélectionner un fichier image valide');
                    return;
                }
                
                // Vérification de la taille (10MB max)
                if (file.size > 10 * 1024 * 1024) {
                    this.showError('Le fichier est trop volumineux (max 10MB)');
                    return;
                }
                
                analyzeBtn.disabled = false;
                this.updateFileLabel(file.name);
                this.updateStatus('📁 Image sélectionnée');
            } else {
                analyzeBtn.disabled = true;
                this.updateFileLabel('Sélectionner une image');
                this.updateStatus('🤖 IA prête');
            }
        });

        // Event listener pour le bouton analyser
        analyzeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Bouton Analyze cliqué');
            this.analyzeLeaf();
        });

        // Event listener pour le bouton reset
        refreshBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Bouton Reset cliqué');
            this.reset();
        });

        console.log('Event listeners configurés avec succès');
    }

    checkPWASupport() {
        // Vérification installation PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Afficher bouton installation
            this.showInstallButton(deferredPrompt);
        });
    }

    showInstallButton(deferredPrompt) {
        const installBtn = document.createElement('button');
        installBtn.textContent = '📱 Installer l\'app';
        installBtn.className = 'install-btn';
        installBtn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('PWA installée');
                }
                deferredPrompt = null;
                installBtn.remove();
            });
        });
        
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            uploadSection.appendChild(installBtn);
        }
    }

    analyzeLeaf() {
        console.log('Début analyse...');
        
        if (!this.isOpenCVLoaded) {
            this.showError('OpenCV n\'est pas encore chargé. Veuillez patienter...');
            return;
        }

        const fileInput = document.getElementById('file');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showError('Veuillez sélectionner une image');
            return;
        }

        this.updateStatus('🔬 Analyse en cours...');
        
        // Désactiver le bouton pendant l'analyse
        const analyzeBtn = document.getElementById('analyze-btn');
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<div class="loading"></div> Analyse...';
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    this.processImage(img);
                } catch (error) {
                    console.error('Erreur lors du traitement:', error);
                    this.showError(`Erreur lors de l'analyse: ${error.message}`);
                } finally {
                    // Réactiver le bouton
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="fas fa-microscope"></i> Analyze';
                }
            };
            img.onerror = () => {
                this.showError('Impossible de charger l\'image');
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-microscope"></i> Analyze';
            };
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            this.showError('Erreur lors de la lecture du fichier');
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-microscope"></i> Analyze';
        };
        
        reader.readAsDataURL(file);
    }

    processImage(img) {
        console.log('Traitement de l\'image...');
        
        try {
            // Créer canvas pour l'image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            console.log('Canvas créé:', { width: canvas.width, height: canvas.height });

            // Convertir en matrice OpenCV
            const src = this.cv.imread(canvas);
            const hsv = new this.cv.Mat();
            
            // Conversion BGR vers HSV
            this.cv.cvtColor(src, hsv, this.cv.COLOR_RGBA2RGB);
            this.cv.cvtColor(hsv, hsv, this.cv.COLOR_RGB2HSV);

            // Masque pour les zones vertes (feuille)
            const lowerGreen = new this.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [25, 40, 40, 0]);
            const upperGreen = new this.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [90, 255, 255, 255]);
            const maskLeaf = new this.cv.Mat();
            this.cv.inRange(hsv, lowerGreen, upperGreen, maskLeaf);
            const leafArea = this.cv.countNonZero(maskLeaf);

            // Masque pour les zones brunes (lésions)
            const lowerBrown = new this.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [10, 50, 50, 0]);
            const upperBrown = new this.cv.Mat(hsv.rows, hsv.cols, hsv.type(), [30, 255, 255, 255]);
            const maskLesion = new this.cv.Mat();
            this.cv.inRange(hsv, lowerBrown, upperBrown, maskLesion);
            const lesionArea = this.cv.countNonZero(maskLesion);

            // Calcul de la sévérité
            const severity = leafArea > 0 ? (lesionArea / leafArea) * 100 : 0;

            console.log('Résultats analyse:', { leafArea, lesionArea, severity });

            // Dessiner les contours
            const contours = new this.cv.MatVector();
            const hierarchy = new this.cv.Mat();
            this.cv.findContours(maskLesion, contours, hierarchy, this.cv.RETR_EXTERNAL, this.cv.CHAIN_APPROX_SIMPLE);

            const result = src.clone();
            for (let i = 0; i < contours.size(); i++) {
                this.cv.drawContours(result, contours, i, [255, 0, 0, 255], 2);
            }

            // Afficher résultats
            this.displayResults(result, leafArea, lesionArea, severity);

            // Libération mémoire
            src.delete(); hsv.delete(); maskLeaf.delete(); maskLesion.delete();
            lowerGreen.delete(); upperGreen.delete(); lowerBrown.delete(); upperBrown.delete();
            contours.delete(); hierarchy.delete(); result.delete();

        } catch (error) {
            console.error('Erreur processImage:', error);
            this.showError(`Erreur d'analyse: ${error.message}`);
        }
    }

    displayResults(resultMat, leafArea, lesionArea, severity) {
        // Afficher image résultat
        const canvas = document.getElementById('result-canvas') || document.createElement('canvas');
        canvas.id = 'result-canvas';
        this.cv.imshow(canvas, resultMat);

        // Créer section résultats
        const resultSection = document.getElementById('result');
        resultSection.innerHTML = `
            <div class="result-success">
                <h3><i class="fas fa-leaf"></i> Résultats d'analyse</h3>
                <div class="result-grid">
                    <div class="result-image">
                        <h4>Image analysée</h4>
                        ${canvas.outerHTML}
                    </div>
                    <div class="result-metrics">
                        <div class="metric">
                            <span class="metric-label">🌿 Zone feuille:</span>
                            <span class="metric-value">${leafArea.toLocaleString()} px²</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">🦠 Zone lésions:</span>
                            <span class="metric-value">${lesionArea.toLocaleString()} px²</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">📊 Sévérité:</span>
                            <span class="metric-value ${this.getSeverityClass(severity)}">${severity.toFixed(1)}%</span>
                        </div>
                        <div class="diagnosis">
                            ${this.getDiagnosis(severity)}
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.updateStatus('✅ Analyse terminée');
        console.log('Résultats affichés');
    }

    getSeverityClass(severity) {
        if (severity < 5) return 'healthy';
        if (severity < 15) return 'mild';
        if (severity < 30) return 'moderate';
        return 'severe';
    }

    getDiagnosis(severity) {
        if (severity < 5) {
            return '<div class="diagnosis-healthy">✅ <strong>Feuille saine</strong> - Peu de signes de maladie</div>';
        } else if (severity < 15) {
            return '<div class="diagnosis-mild">⚠️ <strong>Infection légère</strong> - Surveillance recommandée</div>';
        } else if (severity < 30) {
            return '<div class="diagnosis-moderate">🔶 <strong>Infection modérée</strong> - Traitement conseillé</div>';
        } else {
            return '<div class="diagnosis-severe">🚨 <strong>Infection sévère</strong> - Traitement urgent</div>';
        }
    }

    showError(message) {
        const resultSection = document.getElementById('result');
        resultSection.innerHTML = `
            <div class="result-error">
                <h3><i class="fas fa-exclamation-triangle"></i> Erreur</h3>
                <p>${message}</p>
            </div>
        `;
        this.updateStatus('❌ Erreur');
        console.error('Erreur:', message);
    }

    updateStatus(status) {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerHTML = status;
        } else {
            console.warn('Element status non trouvé');
        }
    }

    updateFileLabel(filename) {
        const fileLabel = document.querySelector('.file-label');
        if (fileLabel) {
            fileLabel.innerHTML = `<i class="fas fa-check"></i> ${filename}`;
        }
    }

    reset() {
        console.log('Reset de l\'application');
        
        const fileInput = document.getElementById('file');
        const analyzeBtn = document.getElementById('analyze-btn');
        const resultSection = document.getElementById('result');
        const fileLabel = document.querySelector('.file-label');
        
        if (fileInput) fileInput.value = '';
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-microscope"></i> Analyze';
        }
        if (resultSection) resultSection.innerHTML = '';
        if (fileLabel) {
            fileLabel.innerHTML = '<i class="fas fa-upload"></i> Select an Image';
        }
        
        this.updateStatus('🤖 IA prête');
    }
}

// Initialisation de l'application avec gestion d'erreurs
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM chargé, initialisation LeafDiag AI...');
    try {
        new LeafDiagApp();
    } catch (error) {
        console.error('Erreur initialisation:', error);
    }
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejetée:', event.reason);
});