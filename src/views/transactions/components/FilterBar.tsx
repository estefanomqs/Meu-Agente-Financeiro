import React from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    uniqueTags: string[];
    selectedTag: string | null;
    setSelectedTag: (tag: string | null) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    searchTerm,
    setSearchTerm,
    uniqueTags,
    selectedTag,
    setSelectedTag
}) => {
    return (
        <div className="w-full bg-background/95 backdrop-blur-xl border-b border-zinc-800/50 mb-4 transition-all px-4 py-2">
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                </div>

                {uniqueTags.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto max-w-[40%] scrollbar-hide mask-gradient-left-right">
                        {uniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                                className={`
                        px-2.5 py-1.5 rounded-lg text-[10px] font-medium border whitespace-nowrap transition-all
                        ${selectedTag === tag
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}
                     `}
                            >
                                #{tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
