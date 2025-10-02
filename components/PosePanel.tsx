/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

interface PosePanelProps {
  onPoseSelect: (index: number) => void;
  currentPoseIndex: number;
  poseInstructions: string[];
  isLoading: boolean;
}

const PosePanel: React.FC<PosePanelProps> = ({ onPoseSelect, currentPoseIndex, poseInstructions, isLoading }) => {
  return (
    <div className="pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Change Pose</h2>
      <div className="grid grid-cols-2 gap-2">
        {poseInstructions.map((pose, index) => (
          <button
            key={pose}
            onClick={() => onPoseSelect(index)}
            disabled={isLoading}
            className={`w-full text-left text-sm font-medium p-3 rounded-lg transition-colors disabled:opacity-50 ${
              currentPoseIndex === index 
                ? 'bg-gray-800 text-white' 
                : 'bg-white text-gray-800 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {pose}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PosePanel;