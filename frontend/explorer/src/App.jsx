// Pi Supernode V20 Explorer - Real-time Dashboard
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [blocks, setBlocks] = useState([]);
  const [balances, setBalances] = useState({});
  const [nodeStatus, setNodeStatus] = useState({});

  // V20 Real-time WebSocket
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:31401/ws');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'block') {
        setBlocks(prev => [data.block, ...prev.slice(0, 99)]);
      } else if (data.type === 'balance') {
        setBalances(data.balances);
      }
    };

    // Fetch initial status
    fetch('/health').then(r => r.json()).then(setNodeStatus);
    
    return () => ws.close();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 text-white">
      <header className="p-8">
        <h1 className="text-4xl font-bold">🚀 Pi Supernode V20 Explorer</h1>
        <div className="mt-4 text-lg">
          Status: <span className={nodeStatus.sync ? 'text-green-400' : 'text-red-400'}>
            {nodeStatus.status || 'Loading...'}
          </span> | 
          Protocol: <span className="font-mono">{nodeStatus.protocol}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8">
        {/* Block Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <h2 className="text-2xl mb-4">📈 Block Rate (TPS)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={blocks}>
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="txCount" stroke="#8B5CF6" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Wallet Balances */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <h2 className="text-2xl mb-4">💰 Balances</h2>
          <div className="space-y-2">
            {Object.entries(balances).map(([addr, bal]) => (
              <div key={addr} className="flex justify-between text-sm">
                <span className="font-mono truncate">{addr.slice(0,12)}...</span>
                <span>{(bal / 1e9).toFixed(2)} PI</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent TXs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-2xl mb-4">🔄 Recent Transactions</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {blocks.slice(0,5).map(block => (
              <div key={block.hash} className="p-3 bg-white/5 rounded-lg">
                <div className="flex justify-between">
                  <span>Block #{block.height}</span>
                  <span>{block.txCount} TXs</span>
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {new Date(block.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
