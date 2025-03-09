import { useState } from "react"
import { router, Link } from '@inertiajs/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
    TrendingUp, TrendingDown, ChevronLeft, ChevronRight, 
    ExternalLink, MoreVertical 
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Simplified gradients
const tokenGradients = [
    "bg-gradient-to-r from-purple-500 to-blue-500",
    "bg-gradient-to-r from-blue-500 to-cyan-500",
    "bg-gradient-to-r from-green-500 to-emerald-500",
]

const TokenActions = ({ token }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-zinc-900 border-white/20">
            <DropdownMenuItem 
                onClick={() => window.open(`https://sonicscan.org/token/${token.contractAddress}`, '_blank')}
                className="text-white hover:bg-white/5"
            >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on SonicScan
            </DropdownMenuItem>
            <DropdownMenuItem 
                onClick={() => router.visit(`/buy-instant?token=${token.id}`)}
                className="text-green-500 hover:bg-white/5"
            >
                Trade on Sonic
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
)

export default function MarketOverview({ tokens }) {
    const [currentPage, setCurrentPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState('market_cap')
    const itemsPerPage = 10

    // Simplified number formatting
    const formatNumber = (value, prefix = "") => {
        if (!value) return "N/A"
        const num = parseFloat(value)
        return num >= 1e6 ? `${prefix}${(num / 1e6).toFixed(2)}M` : `${prefix}${num.toFixed(2)}`
    }

    // Basic filtering
    const filteredTokens = tokens.filter(token => 
        searchQuery.toLowerCase().trim() === "" || 
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const totalPages = Math.ceil(filteredTokens.length / itemsPerPage)
    const paginatedData = filteredTokens.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <AdminPanelLayout title="Sonic Market Research">
            <div className="p-4 sm:p-6 space-y-6">
                {/* Search and Filters */}
                <div className="flex gap-4 mb-6">
                    <Input
                        type="text"
                        placeholder="Search tokens..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="max-w-xs"
                    />
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Token</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Price in SONIC</TableHead>
                                <TableHead>24h Change</TableHead>
                                <TableHead>Volume</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.map((token, index) => (
                                <TableRow key={token.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full ${tokenGradients[index % 3]} flex items-center justify-center text-white`}>
                                                {token.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white flex items-center gap-2">
                                                    {token.name}
                                                    <a
                                                        href={`https://sonicscan.org/token/${token.contractAddress}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-400 hover:text-white"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                                <div className="text-sm text-gray-400">{token.symbol}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>${formatNumber(token.price)}</TableCell>
                                    <TableCell>{formatNumber(token.sonicPrice)} SONIC</TableCell>
                                    <TableCell>
                                        <div className={`flex items-center ${token.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                                            {token.change24h >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                                            {Math.abs(token.change24h)}%
                                        </div>
                                    </TableCell>
                                    <TableCell>${formatNumber(token.volume)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.visit(`/buy-instant?token=${token.id}`)}
                                                className="bg-black text-white border-white/10 hover:bg-white/5"
                                            >
                                                Trade
                                            </Button>
                                            <TokenActions token={token} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card View */}
                <div className="grid md:hidden grid-cols-1 sm:grid-cols-2 gap-4">
                    {paginatedData.map((token, index) => (
                        <Card key={token.id} className="bg-zinc-900 border-white/10">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full ${tokenGradients[index % 3]} flex items-center justify-center text-white`}>
                                            {token.symbol[0]}
                                        </div>
                                        <div>
                                            <CardTitle className="text-white flex items-center gap-2">
                                                {token.name}
                                                <a
                                                    href={`https://sonicscan.org/token/${token.contractAddress}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-gray-400 hover:text-white"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            </CardTitle>
                                            <div className="text-sm text-gray-400">{token.symbol}</div>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-white">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Price:</span>
                                        <span>${formatNumber(token.price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">SONIC Price:</span>
                                        <span>{formatNumber(token.sonicPrice)} SONIC</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">24h:</span>
                                        <span className={token.change24h >= 0 ? "text-green-500" : "text-red-500"}>
                                            {token.change24h}%
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => router.visit(`/buy-instant?token=${token.id}`)}
                                        className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                                    >
                                        Trade on Sonic
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTokens.length)} of {filteredTokens.length}
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
        </AdminPanelLayout>
    )
}
