import { useState } from 'react';
import { useGame } from '../context/GameContext';
import './MainMenu.css';

export default function MainMenu() {
    const { startGame, restartGame, difficulty, setDifficulty } = useGame();
    const [showSettings, setShowSettings] = useState(false);

    const difficulties = ['Easy', 'Normal', 'Hard', 'Survival'];

    const handleDifficultyClick = () => {
        const currentIndex = difficulties.indexOf(difficulty.charAt(0).toUpperCase() + difficulty.slice(1));
        const nextIndex = (currentIndex + 1) % difficulties.length;
        setDifficulty(difficulties[nextIndex].toLowerCase());
    };

    if (showSettings) {
        return (
            <div className="main-menu-container">
                <div className="retro-panel settings-panel">
                    <h2>SETTINGS</h2>
                    <div className="setting-row">
                        <label>Master Volume</label>
                        <input type="range" min="0" max="100" />
                    </div>
                    <div className="setting-row">
                        <label>SFX Volume</label>
                        <input type="range" min="0" max="100" />
                    </div>
                    <div className="setting-row">
                        <label>Sensitivity</label>
                        <input type="range" min="0" max="100" />
                    </div>
                    <button className="retro-btn" onClick={() => setShowSettings(false)}>BACK</button>
                </div>
            </div>
        );
    }

    return (
        <div className="main-menu-container">
            <div className="retro-panel menu-panel">
                <h1 className="game-title">S.A.S.S.</h1>
                <div className="menu-buttons">
                    <button className="retro-btn start-btn" onClick={startGame}>START GAME</button>
                    <button className="retro-btn" onClick={restartGame}>RESTART</button>
                    <button className="retro-btn" onClick={() => setShowSettings(true)}>SETTINGS</button>
                    <button className="retro-btn" onClick={handleDifficultyClick}>DIFFICULTY: {difficulty.toUpperCase()}</button>
                </div>
                <div className="footer-text">v0.1.0 ALPHA</div>
            </div>
        </div>
    );
}
