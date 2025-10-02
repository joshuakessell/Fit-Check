/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { WardrobeItem } from '../types';
import { Trash2Icon } from './icons';

interface CurrentOutfitPanelProps {
  wornTop: WardrobeItem | null;
  wornBottom: WardrobeItem | null;
  onRemoveGarment: (category: 'top' | 'bottom') => void;
  onColorChange: (category: 'top' | 'bottom', color: string) => void;
  isLoading: boolean;
}

const COLORS = ['#d94e4e', '#5a81e1', '#64b664', '#e1e161', '#333333', '#ffffff'];

const GarmentSlot: React.FC<{
    item: WardrobeItem | null;
    type: 'top' | 'bottom';
    onRemove: () => void;
    onColorChange: (color: string) => void;
    isLoading: boolean;
}> = ({ item, type, onRemove, onColorChange, isLoading }) => {
    const title = type === 'top' ? 'Top' : 'Bottom';
    if (!item) {
        return (
            <div className="flex items-center bg-white/50 p-3 rounded-lg border border-dashed border-gray-300">
                <span className="font-semibold text-gray-500">{title}: <em className="font-normal">Empty</em></span>
            </div>
        );
    }

    return (
        <div className="bg-white/50 p-2 rounded-lg animate-fade-in border border-gray-200/80">
            <div className="flex items-center justify-between">
                <div className="flex items-center overflow-hidden">
                    <img src={item.url} alt={item.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3" />
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 font-medium">{title}</span>
                        <span className="font-semibold text-gray-800 truncate" title={item.name}>{item.name}</span>
                    </div>
                </div>
                <button
                    onClick={onRemove}
                    disabled={isLoading}
                    className="flex-shrink-0 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50 disabled:opacity-50"
                    aria-label={`Remove ${item.name}`}
                >
                    <Trash2Icon className="w-5 h-5" />
                </button>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200/80">
                <p className="text-xs font-semibold text-gray-600 mb-2 px-1">Change Color</p>
                <div className="flex flex-wrap gap-2 px-1 items-center">
                    <button
                      onClick={() => onColorChange('original')}
                      disabled={isLoading}
                      className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 disabled:cursor-not-allowed ${!item.activeColor ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-gray-300 hover:border-gray-500'}`}
                      style={{ background: 'conic-gradient(from 90deg at 50% 50%, #ef4444, #f97316, #eab308, #84cc16, #22c55e, #14b8a6, #06b6d4, #3b82f6, #8b5cf6, #d946ef, #ec4899, #ef4444)' }}
                      title="Original color"
                      aria-label="Original color"
                    />
                    {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => onColorChange(color)}
                          disabled={isLoading}
                          className={`w-7 h-7 rounded-full border-2 transition-transform active:scale-90 disabled:cursor-not-allowed ${item.activeColor === color ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-800' : 'border-gray-300 hover:border-gray-500'}`}
                          style={{ backgroundColor: color }}
                          aria-label={`Change color to ${color}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

const CurrentOutfitPanel: React.FC<CurrentOutfitPanelProps> = ({ wornTop, wornBottom, onRemoveGarment, onColorChange, isLoading }) => {
  return (
    <div>
      <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-3">Current Outfit</h2>
      <div className="space-y-2">
        <GarmentSlot 
            item={wornTop} 
            type="top" 
            onRemove={() => onRemoveGarment('top')}
            onColorChange={(color) => onColorChange('top', color)}
            isLoading={isLoading}
        />
        <GarmentSlot
            item={wornBottom}
            type="bottom"
            onRemove={() => onRemoveGarment('bottom')}
            onColorChange={(color) => onColorChange('bottom', color)}
            isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default CurrentOutfitPanel;
