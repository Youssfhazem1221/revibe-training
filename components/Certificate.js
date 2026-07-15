'use client';

import { useRef } from 'react';

/**
 * Certificate - Downloadable completion certificate
 */
export default function Certificate({ certificateData, onClose }) {
  const certificateRef = useRef(null);

  const handleDownload = () => {
    // In a production app, you'd use html2canvas or similar to generate a PDF
    // For now, we'll trigger a print dialog
    window.print();
  };

  if (!certificateData) return null;

  const { userName, materialName, completedAt, certificateId, issuedBy } = certificateData;

  return (
    <div className="certificate-overlay">
      <div className="certificate-modal">
        <div className="certificate-container" ref={certificateRef}>
          <div className="certificate-border">
            <div className="certificate-content">
              {/* Header */}
              <div className="certificate-header">
                <div className="certificate-logo">
                  <span className="logo-text">REVIBE</span>
                </div>
                <h1 className="certificate-title">Certificate of Completion</h1>
                <div className="certificate-divider" />
              </div>

              {/* Body */}
              <div className="certificate-body">
                <p className="certificate-text">This is to certify that</p>
                <h2 className="certificate-name">{userName}</h2>
                <p className="certificate-text">has successfully completed</p>
                <h3 className="certificate-course">{materialName}</h3>
                <p className="certificate-date">on {completedAt}</p>
              </div>

              {/* Footer */}
              <div className="certificate-footer">
                <div className="certificate-signature-section">
                  <div className="certificate-signature-line" />
                  <p className="certificate-signature-label">Authorized Signature</p>
                  <p className="certificate-issuer">{issuedBy}</p>
                </div>

                <div className="certificate-seal">
                  <div className="seal-circle">
                    <i className="material-icons">verified</i>
                  </div>
                  <p className="seal-text">Official Certificate</p>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="certificate-id">
                Certificate ID: {certificateId}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="certificate-actions">
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-gradient" onClick={handleDownload}>
            <i className="material-icons">download</i>
            Download / Print
          </button>
        </div>
      </div>

      <style jsx>{`
        .certificate-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }

        .certificate-modal {
          max-width: 900px;
          width: 100%;
        }

        .certificate-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .certificate-border {
          border: 8px double #D4AF37;
          padding: 40px;
          background: linear-gradient(135deg, #FDFBF7 0%, #FFFFFF 100%);
        }

        .certificate-content {
          text-align: center;
        }

        /* Header */
        .certificate-header {
          margin-bottom: 40px;
        }

        .certificate-logo {
          margin-bottom: 16px;
        }

        .logo-text {
          font-size: 36px;
          font-weight: 900;
          font-family: 'Poppins', sans-serif;
          background: var(--gradient-hero);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 2px;
        }

        .certificate-title {
          font-size: 42px;
          font-weight: 700;
          color: #1A1A1A;
          font-family: 'Poppins', sans-serif;
          margin: 0;
          letter-spacing: 1px;
        }

        .certificate-divider {
          width: 200px;
          height: 3px;
          background: var(--gradient-hero);
          margin: 20px auto;
        }

        /* Body */
        .certificate-body {
          margin: 40px 0;
        }

        .certificate-text {
          font-size: 18px;
          color: #666;
          margin: 12px 0;
          font-style: italic;
        }

        .certificate-name {
          font-size: 48px;
          font-weight: 700;
          color: var(--accent-pink);
          font-family: 'Poppins', sans-serif;
          margin: 24px 0;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .certificate-course {
          font-size: 32px;
          font-weight: 600;
          color: var(--accent-purple);
          font-family: 'Poppins', sans-serif;
          margin: 24px 0;
        }

        .certificate-date {
          font-size: 16px;
          color: #888;
          margin-top: 16px;
        }

        /* Footer */
        .certificate-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 60px;
          padding-top: 40px;
          border-top: 2px solid #E5E7EB;
        }

        .certificate-signature-section {
          text-align: left;
        }

        .certificate-signature-line {
          width: 250px;
          height: 2px;
          background: #333;
          margin-bottom: 8px;
        }

        .certificate-signature-label {
          font-size: 12px;
          color: #666;
          margin: 4px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .certificate-issuer {
          font-size: 14px;
          font-weight: 600;
          color: #333;
          margin: 0;
        }

        .certificate-seal {
          text-align: center;
        }

        .seal-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--gradient-hero);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          box-shadow: 0 4px 12px rgba(255, 46, 99, 0.3);
        }

        .seal-circle i {
          font-size: 48px;
          color: white;
        }

        .seal-text {
          font-size: 11px;
          color: #666;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .certificate-id {
          margin-top: 40px;
          font-size: 11px;
          color: #999;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 1px;
        }

        /* Actions */
        .certificate-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 24px;
        }

        .certificate-actions .btn {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Print styles */
        @media print {
          .certificate-overlay {
            position: static;
            background: white;
          }

          .certificate-actions {
            display: none;
          }

          .certificate-container {
            box-shadow: none;
          }
        }

        @media (max-width: 768px) {
          .certificate-container {
            padding: 20px;
          }

          .certificate-border {
            padding: 20px;
          }

          .certificate-title {
            font-size: 32px;
          }

          .certificate-name {
            font-size: 36px;
          }

          .certificate-course {
            font-size: 24px;
          }

          .certificate-footer {
            flex-direction: column;
            gap: 32px;
            align-items: center;
          }

          .certificate-signature-section {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
