// App.tsx
import { useState } from "react";
import "./App.css";

type Assignment = { round: number; group: string };

function App() {
    // Configurable settings
    const [maxUsers, setMaxUsers] = useState<number>(45);
    const [groupCount, setGroupCount] = useState<number>(3); // slider: 1..7

    // Running state
    const [currentUser, setCurrentUser] = useState<number>(0);
    const [assignedUsers, setAssignedUsers] = useState<Record<number, Assignment[]>>({});

    // Per-round distribution and membership, keyed by dynamic group labels
    const [distribution, setDistribution] = useState<Record<number, Record<string, number>>>({
        1: {},
        2: {},
        3: {},
    });
    const [groupMembers, setGroupMembers] = useState<Record<number, Record<string, number[]>>>({
        1: {},
        2: {},
        3: {},
    });

    // UI dialogs
    const [showDialog, setShowDialog] = useState<boolean>(false);
    const [showHistory, setShowHistory] = useState<boolean>(false);

    // History tracker (flat log for completeness, UI uses assignedUsers grouped by user)
    const [history, setHistory] = useState<{ userId: number; round: number; group: string }[]>([]);

    // Dynamic group labels A..G based on slider (max 7)
    const groups: string[] = Array.from({ length: groupCount }, (_, i) => String.fromCharCode(65 + i));

    // Build round state aligned to current groups (preserves existing counts only for active groups)
    function initRoundState() {
        const dist: Record<number, Record<string, number>> = {};
        const members: Record<number, Record<string, number[]>> = {};
        for (let r = 1; r <= 3; r++) {
            dist[r] = {};
            members[r] = {};
            groups.forEach((g) => {
                dist[r][g] = distribution[r]?.[g] || 0;
                members[r][g] = groupMembers[r]?.[g] || [];
            });
        }
        return { dist, members };
    }

    // Balanced + novelty-aware group picking
    function pickBalancedNovelGroup(
        round: number,
        dist: Record<number, Record<string, number>>,
        members: Record<number, Record<string, number[]>>,
        maxUsersTotal: number
    ): string {
        // Target per-group capacity for this run (balanced cap)
        const base = Math.floor(maxUsersTotal / groups.length);
        const extra = maxUsersTotal % groups.length;

        // Only groups under their cap are eligible
        const eligible: string[] = groups.filter((g, idx) => {
            const limit = idx < extra ? base + 1 : base;
            return dist[round][g] < limit;
        });

        // Score by overlap: prefer groups with fewer members who've previously been in the same group
        const scored = eligible.map((g) => {
            const membersInGroup = members[round][g] || [];
            const overlap = membersInGroup.filter((m) =>
                (assignedUsers[m] || []).some((a) => a.group === g)
            ).length;
            return { group: g, score: overlap };
        });

        // Choose among the minimum-overlap groups at random for novelty
        const minScore = Math.min(...scored.map((s) => s.score));
        const bestGroups = scored.filter((s) => s.score === minScore);
        return bestGroups[Math.floor(Math.random() * bestGroups.length)].group;
    }

    // Assign next user across three rounds
    const handleAssign = () => {
        if (currentUser >= maxUsers) return;
        const userId = currentUser + 1;

        const { dist: newDistribution, members: newGroupMembers } = initRoundState();
        const userAssignments: Assignment[] = [];

        for (let r = 1; r <= 3; r++) {
            const group = pickBalancedNovelGroup(r, newDistribution, newGroupMembers, maxUsers);
            userAssignments.push({ round: r, group });
            newDistribution[r][group] = (newDistribution[r][group] || 0) + 1;
            newGroupMembers[r][group] = [...newGroupMembers[r][group], userId];
        }

        setDistribution(newDistribution);
        setGroupMembers(newGroupMembers);
        setAssignedUsers((prev) => ({ ...prev, [userId]: userAssignments }));
        setCurrentUser(userId);

        // Update history log
        setHistory((prev) => [
            ...prev,
            ...userAssignments.map((a) => ({ userId, round: a.round, group: a.group })),
        ]);
    };

    // Reverse last assignment
    const handleReverse = () => {
        if (currentUser <= 0) return;
        const userId = currentUser;
        const userAssignments = assignedUsers[userId];
        if (!userAssignments) return;

        const { dist: newDistribution, members: newGroupMembers } = initRoundState();

        userAssignments.forEach((a) => {
            newDistribution[a.round][a.group] = Math.max(0, (newDistribution[a.round][a.group] || 0) - 1);
            newGroupMembers[a.round][a.group] = (newGroupMembers[a.round][a.group] || []).filter(
                (id) => id !== userId
            );
        });

        const nextAssigned = { ...assignedUsers };
        delete nextAssigned[userId];

        setDistribution(newDistribution);
        setGroupMembers(newGroupMembers);
        setAssignedUsers(nextAssigned);
        setCurrentUser(userId - 1);

        // Remove from history
        setHistory((prev) => prev.filter((h) => h.userId !== userId));
    };

    // Reset everything
    const handleReset = () => {
        setCurrentUser(0);
        setAssignedUsers({});
        setDistribution({ 1: {}, 2: {}, 3: {} });
        setGroupMembers({ 1: {}, 2: {}, 3: {} });
        setHistory([]);
    };

    return (
        <div className="app-container">
            <div className="title-bar">
                <h1 className="title">Random Balanced User Group Allocation</h1>
                <div className="title-buttons">
                    <button className="dice-btn" onClick={() => setShowDialog(true)} aria-label="Show distributions">
                        🎲
                    </button>
                    <button className="history-btn" onClick={() => setShowHistory(true)} aria-label="Show history">
                        📜
                    </button>
                </div>
            </div>

            <p className="subtitle">
                Each click assigns one user to 3 random groups (one per round). Groups stay balanced and avoid repeat pairings.
                Adjust the number of groups with the slider (max 7). Reverse last assignment or reset anytime.
            </p>

            {/* Settings */}
            <div className="settings">
                <label htmlFor="maxUsersInput">Max Users: </label>
                <input
                    id="maxUsersInput"
                    type="number"
                    min={1}
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                />
                <div className="slider-row">
                    <label htmlFor="groupSlider">Number of Groups: {groupCount}</label>
                    <input
                        id="groupSlider"
                        type="range"
                        min={1}
                        max={7}
                        value={groupCount}
                        onChange={(e) => setGroupCount(Number(e.target.value))}
                    />
                    <div className="group-labels">
                        {groups.map((g) => (
                            <span key={g} className="badge">
                {g}
              </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="buttons-row">
                <button className="shuffle-btn" onClick={handleAssign} disabled={currentUser >= maxUsers}>
                    {currentUser < maxUsers ? "Assign Next User" : "All Users Assigned"}
                </button>
                <button className="reverse-btn" onClick={handleReverse} disabled={currentUser <= 0}>
                    Reverse Last Assignment
                </button>
                <button className="reset-btn" onClick={handleReset}>Reset</button>
            </div>

            {/* Current user cards */}
            {currentUser > 0 && assignedUsers[currentUser] && (
                <div className="user-results">
                    <h2>User {currentUser} Group Assignments</h2>
                    <div className="cards-row fade-in">
                        {assignedUsers[currentUser]?.map((a, idx) => (
                            <div key={a.round} className="card" style={{ animationDelay: `${idx * 0.15}s` }}>
                                <h3>Round {a.round}</h3>
                                <p className="group-label">Group {a.group}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Distribution dialog */}
            {showDialog && (
                <div className="dialog-overlay" onClick={() => setShowDialog(false)}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <h2>Round Distributions</h2>
                        <div className="dialog-cards-row">
                            {[1, 2, 3].map((r) => (
                                <div key={r} className="result-card">
                                    <h3>Round {r}</h3>
                                    <ul className="distribution-list">
                                        {groups.map((g) => (
                                            <li key={g}>
                                                Group {g}: {distribution[r][g] || 0}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <button className="close-btn" onClick={() => setShowDialog(false)}>Close</button>
                    </div>
                </div>
            )}

            {/* History dialog (grouped by user, styled like your cards) */}
            {showHistory && (
                <div className="dialog-overlay" onClick={() => setShowHistory(false)}>
                    <div className="dialog history-dialog" onClick={(e) => e.stopPropagation()}>
                        <h2>Assignment History</h2>
                        <div className="history-list">
                            {history.map((h, idx) => (
                                <div key={idx} className="history-item">
                                    <span className="history-user">User {h.userId}</span>
                                    <span className="history-round">Round {h.round}</span>
                                    <span className="history-group">Group {h.group}</span>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="muted">No assignments yet. Assign users to populate history.</p>
                            )}
                        </div>
                        <button className="close-btn" onClick={() => setShowHistory(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;