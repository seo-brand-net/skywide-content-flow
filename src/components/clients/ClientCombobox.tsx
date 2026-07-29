"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxClient {
    id: string;
    name: string;
    industry?: string | null;
    website_url?: string | null;
}

interface ClientComboboxProps {
    clients: ComboboxClient[];
    value: string;
    onSelect: (client: ComboboxClient) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function ClientCombobox({ clients, value, onSelect, placeholder = 'Select a client...', disabled, className }: ClientComboboxProps) {
    const [open, setOpen] = useState(false);
    const selected = clients.find((c) => c.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn('w-full justify-between bg-background border-input font-normal', !selected && 'text-muted-foreground', className)}
                >
                    <span className="truncate">
                        {selected ? selected.name : disabled ? 'Loading clients...' : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder="Search clients..." />
                    <CommandList>
                        <CommandEmpty>No clients found.</CommandEmpty>
                        <CommandGroup>
                            {clients.map((c) => (
                                <CommandItem
                                    key={c.id}
                                    value={c.name}
                                    onSelect={() => {
                                        onSelect(c);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn('h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                                    <div className="flex flex-col min-w-0">
                                        <span className="truncate">{c.name}</span>
                                        {c.industry && <span className="text-xs text-muted-foreground truncate">{c.industry}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
