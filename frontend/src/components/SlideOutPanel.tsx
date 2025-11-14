import React from 'react';

type SlideOutPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const SlideOutPanel: React.FC<SlideOutPanelProps> = ({ isOpen, onClose, children }) => {
  return (
    <div className={`fixed top-0 right-0 h-full w-96 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4">
        <button onClick={onClose} className="text-white font-bold mb-4">Close</button>
        {children}
      </div>
    </div>
  );
};

export default SlideOutPanel;