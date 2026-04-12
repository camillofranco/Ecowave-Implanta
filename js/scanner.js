// js/scanner.js
// Handles camera barcode scanning using html5-qrcode

let html5QrcodeScanner = null;
let currentTargetInput = null;

const ScannerService = {
    init() {
        document.getElementById('btnCloseScanner').addEventListener('click', this.stopScanner);
    },

    startScanner(inputId) {
        currentTargetInput = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
        const modal = document.getElementById('modalScanner');
        modal.style.display = 'flex';

        if (!html5QrcodeScanner) {
            html5QrcodeScanner = new Html5QrcodeScanner(
                "reader", 
                { fps: 10, qrbox: {width: 250, height: 100}, supportedScanTypes: [
                    Html5QrcodeScanType.SCAN_TYPE_CAMERA
                ]}, 
                /* verbose= */ false
            );
        }

        html5QrcodeScanner.render(this.onScanSuccess, this.onScanFailure);
    },

    stopScanner() {
        const modal = document.getElementById('modalScanner');
        modal.style.display = 'none';
        
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(error => {
                console.error("Failed to clear html5QrcodeScanner. ", error);
            });
        }
        currentTargetInput = null;
    },

    onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code
        if (currentTargetInput) {
            currentTargetInput.value = decodedText;
            // Provide a tiny visual feedback
            currentTargetInput.style.backgroundColor = 'rgba(0, 230, 118, 0.2)';
            setTimeout(() => {
                currentTargetInput.style.backgroundColor = '';
            }, 500);
        }
        
        // Stop scanning
        ScannerService.stopScanner();
        
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
        // Handle scan failure, usually better to ignore and keep scanning
        // console.warn(`Code scan error = ${error}`);
    }
};

// Initialize scanner events once DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    ScannerService.init();
});
