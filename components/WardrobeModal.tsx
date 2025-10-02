/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon } from './icons';
import { urlToFile, getFriendlyErrorMessage } from '../lib/utils';
import { categorizeGarment } from '../services/geminiService';
import Spinner from './Spinner';


interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  wornTopId?: string;
  wornBottomId?: string;
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  onGarmentCategorized: (item: WardrobeItem) => void;
}

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, wornTopId, wornBottomId, isLoading, wardrobe, onGarmentCategorized }) => {
    const [error, setError] = useState<string | null>(null);
    const [isCategorizing, setIsCategorizing] = useState(false);

    const handleGarmentClick = async (item: WardrobeItem) => {
        const isWorn = (item.category === 'top' && item.id === wornTopId) || (item.category === 'bottom' && item.id === wornBottomId);
        if (isLoading || isWorn) return;
        
        setError(null);
        try {
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item);
        } catch (err) {
            const detailedError = `Failed to load wardrobe item. Check the developer console for details.`;
            setError(detailedError);
            console.error(`Failed to load and convert wardrobe item from URL: ${item.url}.`, err);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file.');
                return;
            }
            setError(null);
            setIsCategorizing(true);
            try {
                const category = await categorizeGarment(file);
                const customGarmentInfo: WardrobeItem = {
                    id: `custom-${Date.now()}`,
                    name: file.name,
                    url: URL.createObjectURL(file),
                    category,
                };
                onGarmentCategorized(customGarmentInfo); // Add to wardrobe list in App state
                onGarmentSelect(file, customGarmentInfo); // Also select it immediately
            } catch (err) {
                setError(getFriendlyErrorMessage(err, "Failed to categorize garment"));
            } finally {
                setIsCategorizing(false);
                 // Reset file input to allow uploading the same file again
                e.target.value = '';
            }
        }
    };

    const tops = wardrobe.filter(item => item.category === 'top');
    const bottoms = wardrobe.filter(item => item.category === 'bottom');

  return (
    <div className="pt-6 border-t border-gray-400/50">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Wardrobe</h2>
        
        {/* Tops Section */}
        <h3 className="text-sm font-semibold text-gray-600 mb-2 mt-4">Tops</h3>
        <div className="grid grid-cols-3 gap-3">
            {tops.map((item) => {
                const isActive = item.id === wornTopId;
                return (
                    <button key={item.id} onClick={() => handleGarmentClick(item)} disabled={isLoading || isActive} className="relative aspect-square border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 group disabled:opacity-60 disabled:cursor-not-allowed" aria-label={`Select ${item.name}`}>
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-xs font-bold text-center p-1">{item.name}</p></div>
                        {isActive && <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center"><CheckCircleIcon className="w-8 h-8 text-white" /></div>}
                    </button>
                );
            })}
        </div>

        {/* Bottoms Section */}
        <h3 className="text-sm font-semibold text-gray-600 mb-2 mt-4">Bottoms</h3>
        <div className="grid grid-cols-3 gap-3">
            {bottoms.map((item) => {
                const isActive = item.id === wornBottomId;
                return (
                    <button key={item.id} onClick={() => handleGarmentClick(item)} disabled={isLoading || isActive} className="relative aspect-square border rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 group disabled:opacity-60 disabled:cursor-not-allowed" aria-label={`Select ${item.name}`}>
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><p className="text-white text-xs font-bold text-center p-1">{item.name}</p></div>
                        {isActive && <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center"><CheckCircleIcon className="w-8 h-8 text-white" /></div>}
                    </button>
                );
            })}
        </div>

        {/* Upload Button */}
        <div className="mt-4">
            <label htmlFor="custom-garment-upload" className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${isLoading || isCategorizing ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 hover:text-gray-600 cursor-pointer'}`}>
                {isCategorizing ? (
                    <>
                        <Spinner />
                        <span className="text-xs text-center mt-1">Categorizing...</span>
                    </>
                ) : (
                    <>
                        <UploadCloudIcon className="w-6 h-6 mb-1"/>
                        <span className="text-xs text-center">Upload New</span>
                    </>
                )}
                <input id="custom-garment-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} disabled={isLoading || isCategorizing}/>
            </label>
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default WardrobePanel;