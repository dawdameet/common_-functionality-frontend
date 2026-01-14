"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Search, Plus, ExternalLink, Globe, Lock, Trash2, Tag, Loader2 } from "lucide-react";
import { useUser } from "../auth/UserContext";

interface VaultLink {
    id: string;
    title: string;
    url: string;
    description: string;
    tags: string[];
    is_shared: boolean;
    owner_id: string;
    created_at: string;
}

export function VaultSurface() {
    const { currentUser } = useUser();
    const [links, setLinks] = useState<VaultLink[]>([]);
    const [filter, setFilter] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const fetchLinks = async () => {
            const { data, error } = await supabase
                .from('vault_links')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                setLinks(data);
            }
            setLoading(false);
        };

        fetchLinks();

        // Realtime
        const channel = supabase.channel('vault_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vault_links' }, (payload) => {
                fetchLinks();
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, []);

    const handleDelete = async (id: string) => {
        if (confirm("Delete this link?")) {
            await supabase.from('vault_links').delete().eq('id', id);
        }
    };

    const filteredLinks = links.filter(l => 
        l.title.toLowerCase().includes(filter.toLowerCase()) || 
        l.tags?.some(t => t.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="p-4 md:p-12 pb-4 md:pb-12 h-full flex flex-col">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight">The Vault</h1>
                    <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base">Curated external knowledge base.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Search links..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 w-64"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Link</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-zinc-400" /></div>
                ) : filteredLinks.length === 0 ? (
                    <div className="text-center text-zinc-500 pt-20">No links found. Add one to get started.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredLinks.map(link => (
                            <div key={link.id} className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-lg transition-all hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col h-40">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${link.is_shared ? 'border-green-200 text-green-600 bg-green-50 dark:bg-green-900/10' : 'border-zinc-200 text-zinc-500'}`}>
                                            {link.is_shared ? "Shared" : "Private"}
                                        </span>
                                    </div>
                                    {(link.owner_id === currentUser?.id || currentUser?.role === 'moderator') && (
                                        <button onClick={() => handleDelete(link.id)} className="text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                
                                <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate mb-1">{link.title}</h3>
                                <p className="text-xs text-zinc-500 line-clamp-2 mb-auto">{link.description || link.url}</p>
                                
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                    <div className="flex gap-1 overflow-hidden">
                                        {link.tags?.map(tag => (
                                            <span key={tag} className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Tag className="w-2 h-2" /> {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <a 
                                        href={link.url.startsWith('http') ? link.url : `https://${link.url}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-indigo-500 hover:text-indigo-400 flex items-center gap-1"
                                    >
                                        Open <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAddModalOpen && <AddLinkModal onClose={() => setIsAddModalOpen(false)} currentUser={currentUser} />}
        </div>
    );
}

function AddLinkModal({ onClose, currentUser }: { onClose: () => void, currentUser: any }) {
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [desc, setDesc] = useState("");
    const [tags, setTags] = useState("");
    const [isShared, setIsShared] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        
        const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);

        const { error } = await supabase.from('vault_links').insert({
            title,
            url,
            description: desc,
            tags: tagArray,
            is_shared: isShared,
            owner_id: currentUser.id
        });

        if (error) {
            alert(error.message);
        } else {
            onClose();
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
                    <h3 className="font-medium">Add to Vault</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div>
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">Title</label>
                        <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="e.g. Q4 Strategy Doc" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">URL</label>
                        <input required value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="https://docs.google.com/..." />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">Description</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none h-20" placeholder="Optional context..." />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-zinc-500 mb-1 block">Tags (comma separated)</label>
                        <input value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="strategy, finance, urgent" />
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                        <input id="share" type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="rounded border-zinc-300" />
                        <label htmlFor="share" className="text-sm select-none cursor-pointer">Share with everyone</label>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-zinc-900 text-sm">Cancel</button>
                        <button disabled={submitting} type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                            {submitting ? "Adding..." : "Add Link"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
