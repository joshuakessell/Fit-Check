/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { validateInput } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface ScenePanelProps {
    onExpressionChange: (expression: string) => void;
    onBackgroundChange: (background: string) => void;
    currentExpression: string;
    currentBackground: string;
    isLoading: boolean;
}

const EXPRESSION_PRESETS = ['Default', 'Happy', 'Laughing', 'Surprised', 'Stoic'];
const BACKGROUND_PRESETS = ['Original Studio', 'City Park', 'Beach at Sunset', 'Modern Loft', 'Basketball Court'];

const ScenePanel: React.FC<ScenePanelProps> = ({ onExpressionChange, onBackgroundChange, currentExpression, currentBackground, isLoading }) => {
    const [customExpression, setCustomExpression] = useState('');
    const [customBackground, setCustomBackground] = useState('');
    const [isValidating, setIsValidating] = useState<'expression' | 'background' | null>(null);
    const [error, setError] = useState('');

    const handleCustomSubmit = async (type: 'expression' | 'background') => {
        const value = type === 'expression' ? customExpression.trim() : customBackground.trim();
        if (!value) return;

        setError('');
        setIsValidating(type);
        try {
            const isValid = await validateInput(value, type);
            if (isValid) {
                if (type === 'expression') onExpressionChange(value);
                else onBackgroundChange(value);
                
                if (type === 'expression') setCustomExpression(''); 
                else setCustomBackground('');
            } else {
                setError(`'${value}' is not a valid ${type}. Please try another.`);
            }
        } catch (err) {
            setError(getFriendlyErrorMessage(err, `Failed to validate ${type}`));
        } finally {
            setIsValidating(null);
        }
    };
    
    return (
        <div className="pt-6 border-t border-gray-400/50">
            <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Scene Controls</h2>
            
            {/* Expression Controls */}
            <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Expression</h3>
                <div className="flex flex-wrap gap-2">
                    {EXPRESSION_PRESETS.map(exp => (
                        <button 
                          key={exp} 
                          onClick={() => onExpressionChange(exp)} 
                          disabled={isLoading} 
                          className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors ${currentExpression === exp ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                        >
                            {exp}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                    <input 
                      type="text" 
                      value={customExpression} 
                      onChange={e => setCustomExpression(e.target.value)} 
                      placeholder="Custom expression..." 
                      className="flex-grow w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
                    />
                    <button 
                      onClick={() => handleCustomSubmit('expression')} 
                      disabled={isLoading || !!isValidating || !customExpression}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:bg-gray-400 flex items-center justify-center w-20"
                    >
                        {isValidating === 'expression' ? <Spinner /> : 'Apply'}
                    </button>
                </div>
            </div>

            {/* Background Controls */}
            <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Background</h3>
                <div className="flex flex-wrap gap-2">
                    {BACKGROUND_PRESETS.map(bg => (
                        <button 
                          key={bg} 
                          onClick={() => onBackgroundChange(bg)} 
                          disabled={isLoading} 
                          className={`px-3 py-1 text-sm font-medium rounded-full border transition-colors ${currentBackground === bg ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                        >
                          {bg}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                    <input 
                      type="text" 
                      value={customBackground} 
                      onChange={e => setCustomBackground(e.target.value)} 
                      placeholder="Custom background..." 
                      className="flex-grow w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
                    />
                    <button 
                      onClick={() => handleCustomSubmit('background')} 
                      disabled={isLoading || !!isValidating || !customBackground}
                      className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-700 disabled:bg-gray-400 flex items-center justify-center w-20"
                    >
                        {isValidating === 'background' ? <Spinner /> : 'Apply'}
                    </button>
                </div>
            </div>
            
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
    );
}

export default ScenePanel;
