import { useGame } from '../context/GameContext';
import './Inventory.css';

export default function Inventory() {
    const { inventory, hotbar, selectedHotbarSlot, setInventory, setHotbar, toggleInventory } = useGame();

    const handleDragStart = (e, index, source) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ index, source }));
    };

    const handleDrop = (e, targetIndex, targetSource) => {
        e.preventDefault();
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const sourceIndex = data.index;
        const sourceSource = data.source; // 'main' or 'hotbar'

        if (sourceSource === targetSource && sourceIndex === targetIndex) return;

        // Logic to swap or move items
        let sourceList = sourceSource === 'main' ? [...inventory] : [...hotbar];
        let targetList = targetSource === 'main' ? [...inventory] : [...hotbar];

        // If source and target are the same list (e.g. main -> main)
        if (sourceSource === targetSource) {
            const item = sourceList[sourceIndex];
            const targetItem = sourceList[targetIndex];
            sourceList[targetIndex] = item;
            sourceList[sourceIndex] = targetItem;
            if (sourceSource === 'main') setInventory(sourceList);
            else setHotbar(sourceList);
        } else {
            // Different lists
            const item = sourceList[sourceIndex];
            const targetItem = targetList[targetIndex];

            // Simple swap for now
            targetList[targetIndex] = item;
            sourceList[sourceIndex] = targetItem;

            if (sourceSource === 'main') {
                setInventory(sourceList);
                setHotbar(targetList);
            } else {
                setHotbar(sourceList);
                setInventory(targetList);
            }
        }
    };

    const allowDrop = (e) => {
        e.preventDefault();
    };

    const handleSplit = (e, index, source) => {
        e.preventDefault(); // Prevent context menu
        // Split logic to be implemented
        console.log('Split not implemented yet');
    };

    return (
        <div className="inventory-overlay">
            <div className="retro-panel inventory-panel">
                <div className="inventory-header">
                    <h2>INVENTORY</h2>
                    <button className="close-btn" onClick={toggleInventory}>X</button>
                </div>

                <div className="inventory-grid">
                    {inventory.map((item, i) => (
                        <div
                            key={`inv-${i}`}
                            className="inventory-slot"
                            onDragOver={allowDrop}
                            onDrop={(e) => handleDrop(e, i, 'main')}
                            onContextMenu={(e) => handleSplit(e, i, 'main')}
                        >
                            {item && (
                                <div
                                    className="item"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i, 'main')}
                                >
                                    <span className="item-icon">{item.icon}</span>
                                    {item.count > 1 && <span className="item-count">{item.count}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="inventory-divider"></div>

                <div className="hotbar-grid">
                    {hotbar.map((item, i) => (
                        <div
                            key={`hot-${i}`}
                            className={`inventory-slot hotbar-slot ${selectedHotbarSlot === i ? 'active' : ''}`}
                            onDragOver={allowDrop}
                            onDrop={(e) => handleDrop(e, i, 'hotbar')}
                        >
                            <span className="hotbar-key">{i + 1}</span>
                            {item && (
                                <div
                                    className="item"
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, i, 'hotbar')}
                                >
                                    <span className="item-icon">{item.icon}</span>
                                    {item.count > 1 && <span className="item-count">{item.count}</span>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
