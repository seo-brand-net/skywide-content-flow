"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    const handleGoHome = () => {
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
            <div className="max-w-2xl w-full text-center slide-in-from-bottom-5 animate-in fade-in duration-500">

                {/* 404 Illustration Area */}
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        {/* Large 404 Text Effect */}
                        <div className="relative z-10">
                            <h1 className="text-[8rem] md:text-[12rem] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-primary to-primary/20 select-none">
                                404
                            </h1>
                        </div>

                        {/* Background Glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/20 blur-[100px] rounded-full"></div>
                    </div>
                </div>

                {/* Friendly Message */}
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Oops… we couldn't find that page.
                </h2>

                {/* Description */}
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-md mx-auto">
                    The page you're looking for may have been moved, deleted, or the link was incorrect.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Button
                        size="lg"
                        onClick={handleGoHome}
                        className="w-full sm:w-auto gap-2 text-lg h-12 px-8"
                    >
                        <Home className="h-5 w-5" />
                        Go Back Home
                    </Button>

                    <Button
                        size="lg"
                        variant="outline"
                        onClick={() => router.back()}
                        className="w-full sm:w-auto gap-2 text-lg h-12 px-8"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        Go Back
                    </Button>
                </div>

                {/* Footer info */}
                <div className="mt-12 pt-8 border-t border-border/50">
                    <p className="text-sm text-muted-foreground">
                        Error Code: 404_PAGE_NOT_FOUND
                    </p>
                </div>
            </div>
        </div>
    );
}