// js/scanner.js
// Handles camera barcode scanning using html5-qrcode

let html5QrCode = null;
let currentTargetInput = null;

const ScannerService = {
    init() {
        document.getElementById('btnCloseScanner').addEventListener('click', () => this.stopScanner());
    },

    startScanner(inputId) {
        currentTargetInput = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const modal = document.getElementById('modalScanner');
        modal.style.display = 'flex';

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("reader");
        }

        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 100 }
            },
            (decodedText, decodedResult) => this.onScanSuccess(decodedText, decodedResult),
            (errorMessage) => this.onScanFailure(errorMessage)
        )
        .catch(err => {
            console.error("Camera start error: ", err);
            alert("Erro ao acessar a câmera traseira do dispositivo. Verifique as permissões de câmera do seu navegador.");
            this.stopScanner();
        });
    },

    stopScanner() {
        const modal = document.getElementById('modalScanner');
        modal.style.display = 'none';
        
        if (html5QrCode && html5QrCode.isScanning) {
            html5QrCode.stop().catch(error => {
                console.error("Failed to stop scanner. ", error);
            });
        }
        currentTargetInput = null;
    },

    onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code
        if (currentTargetInput) {
            currentTargetInput.value = decodedText;
            currentTargetInput.style.backgroundColor = 'rgba(0, 230, 118, 0.2)';
            setTimeout(() => {
                currentTargetInput.style.backgroundColor = '';
            }, 500);
        }
        
        // Stop scanning
        this.stopScanner();
        
        // Play a fake beep
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = context.createOscillator();
            oscillator.type = "sine";
            oscillator.frequency.value = 800;
            oscillator.connect(context.destination);
            oscillator.start();
            setTimeout(() => oscillator.stop(), 100);
        } catch(e) {}
    },

    onScanFailure(error) {
        // Handle scan failure
    }
};

// Initialize scanner events once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ScannerService.init();
});
