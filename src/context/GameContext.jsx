import { createContext, useContext, useState, useEffect } from 'react';

const GameContext = createContext();

export function GameProvider({ children }) {
    const [gameState, setGameState] = useState('menu'); // 'menu', 'playing', 'paused', 'inventory'
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [inventory, setInventory] = useState(Array(20).fill(null));
    const [hotbar, setHotbar] = useState(Array(5).fill(null));
    const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
    const [settings, setSettings] = useState({
        masterVolume: 100,
        sfxVolume: 100,
        sensitivity: 50,
        fullscreen: false,
    });
    const [difficulty, setDifficulty] = useState('normal'); // 'easy', 'normal', 'hard', 'survival'
    const [gameKey, setGameKey] = useState(0);

    // Load initial inventory for testing
    useEffect(() => {
        const initialInventory = [...inventory];
        initialInventory[0] = { id: 'wood', name: 'Wood Log', count: 5, maxStack: 64, icon: '🪵' };
        initialInventory[1] = { id: 'stone', name: 'Stone', count: 2, maxStack: 64, icon: '🪨' };
        initialInventory[2] = { id: 'berry', name: 'Berry', count: 12, maxStack: 64, icon: '🍒' };
        setInventory(initialInventory);

        // Initial hotbar item
        const initialHotbar = [...hotbar];
        initialHotbar[0] = { id: 'axe', name: 'Stone Axe', count: 1, maxStack: 1, icon: '🪓' };
        setHotbar(initialHotbar);
    }, []);

    const toggleInventory = () => {
        if (gameState === 'playing') {
            setGameState('inventory');
            setInventoryOpen(true);
        } else if (gameState === 'inventory') {
            setGameState('playing');
            setInventoryOpen(false);
        }
    };

    const startGame = () => {
        setGameState('playing');
        setInventoryOpen(false);
    };

    const openMenu = () => {
        setGameState('menu');
        setInventoryOpen(false);
    };

    const restartGame = () => {
        setInventory(Array(20).fill(null));
        setHotbar(Array(5).fill(null));
        setGameKey(prev => prev + 1);
        startGame();
    };

    return (
        <GameContext.Provider value={{
            gameState, setGameState,
            inventoryOpen, toggleInventory,
            inventory, setInventory,
            hotbar, setHotbar,
            selectedHotbarSlot, setSelectedHotbarSlot,
            settings, setSettings,
            difficulty, setDifficulty,
            gameKey,
            startGame, openMenu, restartGame
        }}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    return useContext(GameContext);
}
