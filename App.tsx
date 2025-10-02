/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import CurrentOutfitPanel from './components/CurrentOutfitPanel';
import ScenePanel from './components/ScenePanel';
import PosePanel from './components/PosePanel';
import { generateCompositeImage } from './services/geminiService';
import { WardrobeItem } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

interface PendingChanges {
  top: WardrobeItem | null;
  bottom: WardrobeItem | null;
  expression: string;
  background: string;
  poseIndex: number;
}

const App: React.FC = () => {
  const [baseModelUrl, setBaseModelUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  
  // State for the currently displayed image
  const [wornTop, setWornTop] = useState<WardrobeItem | null>(null);
  const [wornBottom, setWornBottom] = useState<WardrobeItem | null>(null);
  const [currentExpression, setCurrentExpression] = useState('Default');
  const [currentBackground, setCurrentBackground] = useState('Original Studio');
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);

  // State for user selections before applying
  const [pendingChanges, setPendingChanges] = useState<PendingChanges | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);

  const handleApplyChanges = useCallback(async () => {
    if (!baseModelUrl || !pendingChanges) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Applying your changes...');

    try {
      const { top, bottom, expression, background, poseIndex } = pendingChanges;
      const newImageUrl = await generateCompositeImage(
        baseModelUrl,
        POSE_INSTRUCTIONS[poseIndex],
        top ?? undefined,
        bottom ?? undefined,
        expression,
        background
      );
      setDisplayImageUrl(newImageUrl);
      
      // Sync current state with pending changes after successful generation
      setWornTop(top);
      setWornBottom(bottom);
      setCurrentExpression(expression);
      setCurrentBackground(background);
      setCurrentPoseIndex(poseIndex);

    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to update the image'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [baseModelUrl, pendingChanges]);
  
  const handleModelFinalized = (url: string) => {
    setBaseModelUrl(url);
    setDisplayImageUrl(url);
    const initialState = {
      top: null,
      bottom: null,
      expression: 'Default',
      background: 'Original Studio',
      poseIndex: 0,
    };
    setWornTop(initialState.top);
    setWornBottom(initialState.bottom);
    setCurrentExpression(initialState.expression);
    setCurrentBackground(initialState.background);
    setCurrentPoseIndex(initialState.poseIndex);
    setPendingChanges(initialState);
  };

  const handleStartOver = () => {
    setBaseModelUrl(null);
    setDisplayImageUrl(null);
    setWornTop(null);
    setWornBottom(null);
    setCurrentExpression('Default');
    setCurrentBackground('Original Studio');
    setCurrentPoseIndex(0);
    setPendingChanges(null);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setWardrobe(defaultWardrobe);
    setIsSheetCollapsed(false);
  };

  const handlePendingChange = (updates: Partial<PendingChanges>) => {
    setPendingChanges(prev => prev ? { ...prev, ...updates } : null);
  };

  const handleGarmentCategorized = (item: WardrobeItem) => {
    setWardrobe(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
    });
  };

  const handleGarmentSelect = useCallback((_garmentFile: File, garmentInfo: WardrobeItem) => {
    if (garmentInfo.category === 'top') {
      handlePendingChange({ top: garmentInfo });
    } else {
      handlePendingChange({ bottom: garmentInfo });
    }
  }, []);

  const handleRemoveGarment = useCallback((category: 'top' | 'bottom') => {
    if (category === 'top') {
      handlePendingChange({ top: null });
    } else {
      handlePendingChange({ bottom: null });
    }
  }, []);

  const handleColorChange = useCallback((category: 'top' | 'bottom', color: string) => {
    if (!pendingChanges) return;
    const isReverting = color === 'original';
    if (category === 'top' && pendingChanges.top) {
        const updatedTop = { ...pendingChanges.top, activeColor: isReverting ? undefined : color };
        handlePendingChange({ top: updatedTop });
    } else if (category === 'bottom' && pendingChanges.bottom) {
        const updatedBottom = { ...pendingChanges.bottom, activeColor: isReverting ? undefined : color };
        handlePendingChange({ bottom: updatedBottom });
    }
  }, [pendingChanges]);

  const hasPendingChanges = useMemo(() => {
    if (!pendingChanges) return false;
    const topChanged = pendingChanges.top?.id !== wornTop?.id || pendingChanges.top?.activeColor !== wornTop?.activeColor;
    const bottomChanged = pendingChanges.bottom?.id !== wornBottom?.id || pendingChanges.bottom?.activeColor !== wornBottom?.activeColor;
    const expressionChanged = pendingChanges.expression !== currentExpression;
    const backgroundChanged = pendingChanges.background !== currentBackground;
    const poseChanged = pendingChanges.poseIndex !== currentPoseIndex;
    return topChanged || bottomChanged || expressionChanged || backgroundChanged || poseChanged;
  }, [pendingChanges, wornTop, wornBottom, currentExpression, currentBackground, currentPoseIndex]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {!baseModelUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-gray-50 p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-white overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading}
                  loadingMessage={loadingMessage}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                style={{ transitionProperty: 'transform' }}
              >
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                    aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                  >
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                  </button>
                  <div className="p-4 md:p-6 pb-32 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <CurrentOutfitPanel 
                      wornTop={pendingChanges?.top ?? null}
                      wornBottom={pendingChanges?.bottom ?? null}
                      onRemoveGarment={handleRemoveGarment}
                      onColorChange={handleColorChange}
                      isLoading={isLoading}
                    />
                    <ScenePanel 
                      onExpressionChange={(exp) => handlePendingChange({ expression: exp })}
                      onBackgroundChange={(bg) => handlePendingChange({ background: bg })}
                      currentExpression={pendingChanges?.expression ?? 'Default'}
                      currentBackground={pendingChanges?.background ?? 'Original Studio'}
                      isLoading={isLoading}
                    />
                    <PosePanel
                      onPoseSelect={(index) => handlePendingChange({ poseIndex: index })}
                      currentPoseIndex={pendingChanges?.poseIndex ?? 0}
                      poseInstructions={POSE_INSTRUCTIONS}
                      isLoading={isLoading}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      wornTopId={pendingChanges?.top?.id}
                      wornBottomId={pendingChanges?.bottom?.id}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                      onGarmentCategorized={handleGarmentCategorized}
                    />
                  </div>

                  <AnimatePresence>
                  {hasPendingChanges && !isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="absolute bottom-0 left-0 right-0 p-4 bg-white/50 backdrop-blur-md border-t border-gray-200/60"
                    >
                      <button
                        onClick={handleApplyChanges}
                        disabled={isLoading}
                        className="w-full px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors disabled:bg-gray-400"
                      >
                        Generate Image
                      </button>
                    </motion.div>
                  )}
                  </AnimatePresence>
              </aside>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!baseModelUrl} />
    </div>
  );
};

export default App;