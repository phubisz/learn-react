import React, { memo } from 'react';

const VerificationLog = memo(({ issues }) => {
    if (!issues || !Array.isArray(issues) || issues.length === 0) return null;

    return (
        <div className="verification-log">
            <h3>Wyniki Weryfikacji</h3>
            <ul className="issues-list">
                {issues.map((issue, index) => {
                    if (!issue) return null;

                    const issueType = issue?.type || 'warning';
                    const issueIcon = issueType === 'error' ? '❌' : issueType === 'success' ? '✅' : '⚠️';

                    return (
                        <li key={index} className={`issue-item ${issueType}`}>
                            <span className="issue-icon">
                                {issueIcon}
                            </span>
                            <span className="issue-message">{issue?.message || 'Unknown issue'}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
});

export default VerificationLog;
