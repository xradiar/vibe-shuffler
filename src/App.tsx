// App.tsx
import { useState } from "react";
import "./App.css";

type Group = "A" | "B" | "C" | "D" | "E" | "F" | "G";
type Assignment = { round: number; group: Group };

const groups: Group[] = ["A", "B", "C", "D", "E", "F", "G"];

function App() {
    const [maxUsers, setMaxUsers] = useState<number>(45);
    const [currentUser, setCurrentUser] = useState<number>(0);
    const [assignedUsers, setAssignedUsers] = useState<Record<number, Assignment[]>>({});
    const [distribution, setDistribution] = useState<Record<number, Record<Group, number>>>({
        1: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
        2: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
        3: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 },
    });
    const [groupMembers, setGroupMembers] = useState<Record<number, Record<Group, number[]>>>({
        1: { A: [], B: [], C: [], D: [], E: [], F: [], G: [] },
        2: { A: [], B: [], C: [], D: [], E: [], F: [], G: [] },
        3: { A: [], B: [], C: [], D: [], E: [], F: [], G: [] },
    });

    const [showDialog, setShowDialog] = useState<boolean>(false);

    function pickBalancedNovelGroup(
        round: number,
        userId: number,
        dist: Record<number, Record<Group, number>>,
        members: Record<number, Record<Group, number[]>>,
        maxUsers: number
    ): Group {
        const base = Math.floor(maxUsers / groups.length);
        const extra = maxUsers % groups.length;

        const eligible: Group[] = groups.filter((g, idx) => {
            const limit = idx < extra ? base + 1 : base;
            return dist[round][g] < limit;
        });

        const scored = eligible.map((g) => {
            const membersInGroup = members[round][g] || [];
            const overlap = membersInGroup.filter((m) =>
                (assignedUsers[m] || []).some((a) => a.group === g)
            ).length;
            return { group: g, score: overlap };
        });

        const minScore = Math.min(...scored.map((s) => s.score));
        const bestGroups = scored.filter((s) => s.score === minScore);
        return bestGroups[Math.floor(Math.random() * bestGroups.length)].group;
    }

    const handleAssign = () => {
        if (currentUser >= maxUsers) return;
        const userId = currentUser + 1;

        const userAssignments: Assignment[] = [];
        const newDistribution = { ...distribution };
        const newGroupMembers = { ...groupMembers };

        for (let r = 1; r <= 3; r++) {
            const group = pickBalancedNovelGroup(r, userId, newDistribution, newGroupMembers, maxUsers);
            userAssignments.push({ round: r, group });
            newDistribution[r][group]++;
            newGroupMembers[r][group] = [...newGroupMembers[r][group], userId];
        }

        setDistribution(newDistribution);
        setGroupMembers(newGroupMembers);
        setAssignedUsers((prev) => ({ ...prev, [userId]: userAssignments }));
        setCurrentUser(userId);
    };

    const handleReverse = () => {
        if (currentUser <= 0) return;
        const userId = currentUser;
        const userAssignments = assignedUsers[userId];
        if (!userAssignments) return;

        const newDistribution = { ...distribution };
        const newGroupMembers = { ...groupMembers };

        userAssignments.forEach((a) => {
            newDistribution[a.round][a.group] = Math.max(0, newDistribution[a.round][a.group] - 1);
            newGroupMembers[a.round][a.group] = newGroupMembers[a.round][a.group].filter(
                (id) => id !== userId
            );
        });

        const newAssignedUsers = { ...assignedUsers };
        delete newAssignedUsers[userId];

        setDistribution(newDistribution);
        setGroupMembers(newGroupMembers);
        setAssignedUsers(newAssignedUsers);
        setCurrentUser(userId - 1);
    };

    return (
        <div className="app-container">
            <div className="title-bar">
                <h1 className="title">Random Balanced User Group Allocation</h1>
                <button className="dice-btn" onClick={() => setShowDialog(true)}>
                    🎲
                </button>
            </div>
            <p className="subtitle">
                Each click assigns one user to 3 random groups (one per round).
                Groups stay balanced and avoid repeat pairings.
                You can also reverse the last assignment.
            </p>

            <div className="settings">
                <label>Max Users: </label>
                <input
                    type="number"
                    min="1"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(Number(e.target.value))}
                />
            </div>

            <div className="buttons-row">
                <button
                    className="shuffle-btn"
                    onClick={handleAssign}
                    disabled={currentUser >= maxUsers}
                >
                    {currentUser < maxUsers ? "Assign Next User" : "All Users Assigned"}
                </button>
                <button className="reverse-btn" onClick={handleReverse} disabled={currentUser <= 0}>
                    Reverse Last Assignment
                </button>
            </div>

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
                                                Group {g}: {distribution[r][g]}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        <button className="close-btn" onClick={() => setShowDialog(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;