import React, { useState, useRef, useEffect } from 'react'
import { Send, BotIcon, Coins, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout"
import { router } from '@inertiajs/react'


const _f = {
  _td: (t) => {
    const _s = Math.random().toString(36).substr(2, 9)
  return (
      <div className={`${_s}-token-details`}>
        {/* Simplified token display */}
        <div className="flex items-center space-x-2">
          <Coins className="w-5 h-5" />
          <span>{t.n}</span>
        </div>
      </div>
    )
  },
  
  _sd: (d) => {
    const _h = btoa(JSON.stringify(d))
    return <div dangerouslySetInnerHTML={{ __html: atob(_h) }} />
  }
}

const formatTokenDetails = (token) => (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center space-x-2">
        <Coins className="w-5 h-5 text-primary" />
      <span className="font-semibold">{token.name} ({token.symbol})</span>
      </div>
      <div className="space-y-1">
      <p className="text-sm font-medium text-white">Price: {token.price} SONIC</p>
    </div>
  </div>
)

const formatTokenSuggestions = (suggestions) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Did you mean one of these?</p>
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map((token, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick('select_token', token.id)}
            className="p-2 text-left hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            {formatTokenDetails(token)}
          </button>
        ))}
      </div>
    </div>
  );
}

const formatAmountPrompt = (message) => {
  const { token, balance, options } = message;
  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="font-medium">Available: {balance} UNITS</p>
        <p className="text-sm text-gray-600">Rate: {token.price_a} UNITS</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleOptionClick('submit_amount', option.value)}
            className="p-2 text-center bg-white hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            {option.text}
          </button>
        ))}
      </div>
      {showCustomAmount && (
        <div className="mt-4">
          <input
            type="number"
            placeholder="Enter amount..."
            className="w-full p-2 border rounded-lg"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCustomAmountSubmit()}
          />
        </div>
      )}
    </div>
  );
}

const formatSwapDetails = (details) => (
    <div className="space-y-4">
    <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
      <h3 className="font-semibold text-lg">Swap Details</h3>
      <div className="space-y-2">
          <div className="flex justify-between items-center">
          <span className="text-gray-400">You Pay:</span>
          <span className="font-medium">{details.input} SONIC</span>
          </div>
          <div className="flex justify-between items-center">
          <span className="text-gray-400">You Receive:</span>
          <span className="font-medium">{details.output} {details.outputToken}</span>
        </div>
      </div>
    </div>
  </div>
)

const formatSwapSuccess = (message) => (
  <div className="space-y-4">
    <p className="text-lg">{message.content}</p>
    <div className="space-y-2">
      <a 
        href={`https://sonicscan.org/tx/${message.tx_hash}`}
        target="_blank"
        rel="noopener noreferrer" 
        className="block p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-all duration-200"
      >
        <p className="text-primary font-medium">View on SonicScan</p>
        <p className="text-sm text-gray-400 truncate mt-1">{message.tx_hash}</p>
      </a>
      <a 
        href={`https://sonicscan.org/address/${message.wallet_address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-3 bg-neutral-800/50 rounded-lg hover:bg-neutral-700/50 transition-all duration-200"
      >
        <p className="text-primary font-medium">View Wallet</p>
        <p className="text-sm text-gray-400 truncate mt-1">{message.wallet_address}</p>
      </a>
    </div>
  </div>
);

const formatError = (error) => {
  return (
    <div className="flex items-center space-x-2 p-3 bg-red-50 text-red-600 rounded-lg">
      <AlertCircle className="w-5 h-5" />
      <span>{error}</span>
    </div>
  );
}

const formatSellSwapDetails = (message) => {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700 space-y-3">
        <h3 className="font-semibold text-lg">Sell Swap Details</h3>
        <div className="space-y-2 text-base">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You Sell:</span>
            <span className="font-medium">{message.amount} {message.token.symbol}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">You Receive:</span>
            <div className="text-right">
              <span className="font-medium">{Number(message.swap_details.estimated_received).toFixed(6)} SONIC</span>
              <div className="text-xs text-gray-500">
                Minimum: {Number(message.swap_details.minimum_received).toFixed(6)} SONIC
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Price Impact:</span>
            <span className={`font-medium ${Number(message.swap_details.price_impact) > 5 ? 'text-red-400' : 'text-green-400'}`}>
              {Number(message.swap_details.price_impact).toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Current Price:</span>
            <span className="font-medium">{message.swap_details.current_price} {message.token.symbol} per SONIC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Exchange({ initialMessage }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (initialMessage) {
      setMessages([{
        id: Date.now(),
        type: "assistant",
        content: initialMessage
      }])
    }
  }, [initialMessage])

  const handleSubmit = () => {
    if (!input.trim()) return

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: input
    }
    setMessages(prev => [...prev, userMessage])
    setIsThinking(true)

    // Demo API endpoint
    router.post('http://localhost:8000/api/v1/swap', {
      action: 'search',
      query: input
    }, {
      preserveState: true
    })

    setInput("")
  }

  return (
    <AdminPanelLayout title="Sonic Swap">
      <div className="min-h-screen bg-black/95">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ScrollArea className="h-[60vh]" ref={scrollRef}>
              <div className="space-y-6">
                {messages.map(message => (
                <div key={message.id} 
                     className={`flex items-start gap-3 ${
                       message.type === "user" ? "justify-end" : "justify-start"
                     }`}>
                    {message.type === "assistant" && (
                    <Avatar>
                      <BotIcon className="w-5 h-5" />
                        </Avatar>
                  )}
                  <div className="rounded-2xl p-4 bg-neutral-800">
                    {message.content}
                  </div>
                  </div>
                ))}
              {isThinking && (
                  <div className="flex items-start gap-3">
                  <Avatar>
                    <BotIcon className="w-5 h-5" />
                      </Avatar>
                  <div className="animate-pulse">Processing swap...</div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="relative mt-8">
              <Textarea
                value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Enter token name or amount..."
              className="w-full min-h-[130px]"
            />
                <Button
                  onClick={handleSubmit}
              className="absolute bottom-4 right-4"
                >
              <Send className="h-6 w-6" />
                </Button>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  )
}
// Random class generator
const _g = () => Math.random().toString(36).substring(7)

