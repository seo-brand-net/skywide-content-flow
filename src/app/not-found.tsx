"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-500">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-background border rounded-lg p-12 text-center shadow-xl">
                    <h1 className="text-[150px] font-bold leading-none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/20 select-none">
                        404
                    </h1>
                    <div className="space-y-2 mb-8">
                        <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
                        <p className="text-muted-foreground max-w-[400px] mx-auto">
                            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or never existed.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto gap-2"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Go Back
                        </Button>
                        <Button asChild className="w-full sm:w-auto gap-2">
                            <Link href="/">
                                <Home className="w-4 h-4" />
                                Return Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-sm text-muted-foreground/50">
                Error Code: 404_NOT_FOUND
            </div>
        </div>
    );
}
