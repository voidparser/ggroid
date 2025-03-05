'use client';

import React from 'react';

interface SoundEffectSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const SoundEffectSelect: React.FC<SoundEffectSelectProps> = ({
  value,
  onChange
}) => {
  const effects = [
    { id: 'normal', name: 'Normal', description: 'Regular droid sounds' },
    { id: 'blatt', name: 'Blatt', description: 'Short "blatt" sounds (fart-like)' },
    { id: 'trill', name: 'Trill', description: 'Excited trills (rapid up/down)' },
    { id: 'whistle', name: 'Whistle', description: 'High-pitched whistle' },
    { id: 'scream', name: 'Scream', description: 'Alarmed scream' },
    { id: 'happy', name: 'Happy', description: 'Happy chirp sequence' },
    { id: 'sad', name: 'Sad', description: 'Sad descending tone' },
    { id: 'question', name: 'Question', description: 'Questioning up-trill' },
    { id: 'random', name: 'Random', description: 'Random mixture of effects' }
  ];

  return (
    <div className="w-full">
      <label htmlFor="effectSelect" className="block text-sm font-medium text-gray-300 mb-2">
        Sound Effect
      </label>
      <div className="relative">
        <select
          id="effectSelect"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="droid-input appearance-none pr-10"
        >
          {effects.map(effect => (
            <option key={effect.id} value={effect.id}>
              {effect.name} - {effect.description}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SoundEffectSelect;