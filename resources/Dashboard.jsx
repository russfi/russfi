import { usePage } from '@inertiajs/react';
import { Link } from '@inertiajs/react';
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
    Wallet, ArrowUpRight, ArrowDownRight, BadgeDollarSign, 
    TrendingUp, Coins, TrendingDown, MoreVertical, 
    ChevronLeft, ChevronRight, ExternalLink 
} from 'lucide-react';
import { useState } from 'react';

// Simplified gradient array for demo
const tokenGradients = [
    "bg-gradient-to-r from-purple-500 to-indigo-500",
    "bg-gradient-to-r from-blue-500 to-cyan-500",
    "bg-gradient-to-r from-green-500 to-emerald-500",
];

// Simplified actions menu
const TokenActions = () => (
  <DropdownMenuContent align="end" className="w-32">
    <DropdownMenuItem className="text-green-500">Buy</DropdownMenuItem>
    <DropdownMenuItem className="text-red-500">Sell</DropdownMenuItem>
  </DropdownMenuContent>
);

export default function Dashboard() {
    const { auth, balances, tokenData } = usePage().props;
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const totalPages = Math.ceil(tokenData.length / itemsPerPage);
    const paginatedData = tokenData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Simplified helper function
    const formatNumber = (num) => Number(num).toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    return (
        <AdminPanelLayout title="Dashboard">
            <div className="p-4 sm:p-6 space-y-6">
                {/* Balance Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-zinc-900/50 border-white/10">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Balance</CardTitle>
                            <BadgeDollarSign className="h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatNumber(balances?.sBalance ?? 0)}
                            </div>
                            <p className="text-xs text-neutral-400">Total Balance</p>
                        </CardContent>
                    </Card>

                    {/* Similar cards for Asset Balance, Trading Style, and PNL */}
                    {/* ... */}
                </div>

                {/* Portfolio Table */}
                <Card className="bg-neutral-900 border-0 rounded-lg">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold mb-6">Portfolio</h2>
                        
                        <div className="space-y-3">
                            {paginatedData.map((token, index) => (
                                <div key={token.id} className="bg-neutral-800/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${tokenGradients[index % tokenGradients.length]} flex items-center justify-center`}>
                                                {token.symbol}
                                            </div>
                                            <div>
                                                <div className="font-medium">{token.name}</div>
                                                <div className="text-sm text-neutral-400">
                                                    Balance: {formatNumber(token.balance)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="text-right">
                                            <div className={token.profit ? "text-green-500" : "text-red-500"}>
                                                {token.profit ? "+" : "-"}{formatNumber(Math.abs(token.pnl))}%
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <TokenActions />
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-neutral-800">
                            <div className="text-sm text-neutral-400">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </AdminPanelLayout>
    );
}
