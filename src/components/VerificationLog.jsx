import React from 'react';

const VerificationLog = ({ issues }) => {
    if (!issues || issues.length === 0) return null;

    return (
        <div className="verification-log">
            <h3>Wyniki Weryfikacji</h3>
            <ul className="issues-list">
                {issues.map((issue, index) => (
                    <li key={index} className={`issue-item ${issue.type}`}>
                        <span className="issue-icon">
                            {issue.type === 'error' ? '❌' : '⚠️'}
                        </span>
                        <span className="issue-message">{issue.message}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default VerificationLog;
