/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import CurrentOutfitPanel from './components/CurrentOutfitPanel';
import ScenePanel from './components/ScenePanel';
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

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};


const App: React.FC = () => {
  const [baseModelUrl, setBaseModelUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);
  const [wornTop, setWornTop] = useState<WardrobeItem | null>(null);
  const [wornBottom, setWornBottom] = useState<WardrobeItem | null>(null);
  const [currentExpression, setCurrentExpression] = useState('Default');
  const [currentBackground, setCurrentBackground] = useState('Original Studio');
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 767px)');

  const updateOutfit = useCallback(async (
    config: {
      top?: WardrobeItem | null,
      bottom?: WardrobeItem | null,
      expression?: string,
      background?: string,
      poseIndex?: number
    }
  ) => {
    if (!baseModelUrl) return;

    const newTop = config.top !== undefined ? config.top : wornTop;
    const newBottom = config.bottom !== undefined ? config.bottom : wornBottom;
    const newExpression = config.expression !== undefined ? config.expression : currentExpression;
    const newBackground = config.background !== undefined ? config.background : currentBackground;
    const newPoseIndex = config.poseIndex !== undefined ? config.poseIndex : currentPoseIndex;

    setError(null);
    setIsLoading(true);
    setLoadingMessage('Updating your look...');

    try {
      const newImageUrl = await generateCompositeImage(
        baseModelUrl,
        POSE_INSTRUCTIONS[newPoseIndex],
        newTop ?? undefined,
        newBottom ?? undefined,
        newExpression,
        newBackground
      );
      setDisplayImageUrl(newImageUrl);
      // Update state after successful generation
      setWornTop(newTop);
      setWornBottom(newBottom);
      setCurrentExpression(newExpression);
      setCurrentBackground(newBackground);
      setCurrentPoseIndex(newPoseIndex);

    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to update the image'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [baseModelUrl, wornTop, wornBottom, currentExpression, currentBackground, currentPoseIndex]);
  
  const handleModelFinalized = (url: string) => {
    setBaseModelUrl(url);
    setDisplayImageUrl(url);
  };

  const handleStartOver = () => {
    setBaseModelUrl(null);
    setDisplayImageUrl(null);
    setWornTop(null);
    setWornBottom(null);
    setCurrentExpression('Default');
    setCurrentBackground('Original Studio');
    setCurrentPoseIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setWardrobe(defaultWardrobe);
    setIsSheetCollapsed(false);
  };

  const handleGarmentCategorized = (item: WardrobeItem) => {
    setWardrobe(prev => {
        if (prev.find(i => i.id === item.id)) return prev;
        return [...prev, item];
    });
  };

  const handleGarmentSelect = useCallback(async (_garmentFile: File, garmentInfo: WardrobeItem) => {
    if (garmentInfo.category === 'top') {
        await updateOutfit({ top: garmentInfo });
    } else {
        await updateOutfit({ bottom: garmentInfo });
    }
  }, [updateOutfit]);

  const handleRemoveGarment = useCallback(async (category: 'top' | 'bottom') => {
    if (category === 'top') {
        await updateOutfit({ top: null });
    } else {
        await updateOutfit({ bottom: null });
    }
  }, [updateOutfit]);

  const handleColorChange = useCallback(async (category: 'top' | 'bottom', color: string) => {
    const isReverting = color === 'original';
    if (category === 'top' && wornTop) {
        const updatedTop = { ...wornTop, activeColor: isReverting ? undefined : color };
        await updateOutfit({ top: updatedTop });
    } else if (category === 'bottom' && wornBottom) {
        const updatedBottom = { ...wornBottom, activeColor: isReverting ? undefined : color };
        await updateOutfit({ bottom: updatedBottom });
    }
  }, [wornTop, wornBottom, updateOutfit]);

  const handleExpressionChange = (expression: string) => {
    if (expression === currentExpression || isLoading) return;
    updateOutfit({ expression });
  };
  const handleBackgroundChange = (background: string) => {
    if (background === currentBackground || isLoading) return;
    updateOutfit({ background });
  };
  
  const handlePoseSelect = (newIndex: number) => {
    if (isLoading || newIndex === currentPoseIndex) return;
    updateOutfit({ poseIndex: newIndex });
  };

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
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={[]} // Pose caching removed
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
                  <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                        <p className="font-bold">Error</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <CurrentOutfitPanel 
                      wornTop={wornTop}
                      wornBottom={wornBottom}
                      onRemoveGarment={handleRemoveGarment}
                      onColorChange={handleColorChange}
                      isLoading={isLoading}
                    />
                    <ScenePanel 
                      onExpressionChange={handleExpressionChange}
                      onBackgroundChange={handleBackgroundChange}
                      currentExpression={currentExpression}
                      currentBackground={currentBackground}
                      isLoading={isLoading}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      wornTopId={wornTop?.id}
                      wornBottomId={wornBottom?.id}
                      isLoading={isLoading}
                      wardrobe={wardrobe}
                      onGarmentCategorized={handleGarmentCategorized}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {isLoading && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner />
                  {loadingMessage && (
                    <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!baseModelUrl} />
    </div>
  );
};

export default App;