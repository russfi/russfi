import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, BotIcon as Robot, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout"
import { router } from '@inertiajs/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { motion } from 'framer-motion'

const _styles = {
  container: {
    base: `min-h-screen bg-black/95 antialiased`,
    inner: `max-w-4xl mx-auto px-4 py-8 md:py-12`,
    // ... other styles
  },
  
  // Generate dynamic class combinations
  get: (key) => {
    const _salt = Math.random().toString(36).substring(7)
    return `${_salt}-${_styles[key]}`
  }
}

export default function A1R({ _im, _m }) {
  const [_i, setInput] = useState("")
  const [_msgs, setMessages] = useState([])
  const [_at, setAiThinking] = useState(true)
  const [_init, setIsInitialized] = useState(false)
  const [_ie, setIsInputEnabled] = useState(false)
  const _sRef = useRef(null)
  const _bRef = useRef(null)

  useEffect(() => {
    if (_msgs.length > 2) {
      const timer = setTimeout(() => {
        _bRef.current?.scrollIntoView({ 
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [_msgs])

  const _rt = [
    {
      t: "Market Analysis",
      d: "General market trend analysis",
      i: Sparkles,
      c: "#" + Math.floor(Math.random()*16777215).toString(16),
      e: "📊"
    },
    {
      t: "Technical Analysis",
      d: "Technical indicators and patterns",
      i: TrendingUp,
      c: "#00c853",
      e: "🚀"
    },
    {
      t: "Risk Assessment",
      d: "Risk evaluation and metrics",
      i: TrendingUp,
      c: "#ff9800",
      e: "⚠️"
    }
  ]

  useEffect(() => {
    if (_sRef.current) {
      _sRef.current.scrollTop = _sRef.current.scrollHeight
    }
  }, [_msgs])

  useEffect(() => {
    if (!_init && _im) {
      setIsInputEnabled(false)
      const userMessage = _hMsg("user", "Hi, I need help with market analysis")
      setMessages([userMessage])
      
      setTimeout(() => {
        const aiResponse = _hMsg("assistant", _im)
        setMessages(prev => [...prev, aiResponse])
        setAiThinking(false)
        setIsInitialized(true)
      }, 1000)
    }
  }, [_im, _init])

  useEffect(() => {
    if (_m) {
      setAiThinking(false)
      const aiResponse = _hMsg("assistant", typeof _m.content === 'string' ? _m.content : _m.content)
      setMessages(prev => [...prev, aiResponse])
    }
  }, [_m])

  const _hRT = async (t) => {
    setIsInputEnabled(false)
    const userMessage = _hMsg("user", `I want ${t} research`)
    setMessages(prev => [...prev, userMessage])
    setAiThinking(true)

    router.post(`${_api.base}/${_api.endpoints.analysis}`, {
      a: 'analyze',
      t: t.toLowerCase()
    }, {
      preserveState: true,
      preserveScroll: true,
    })
  }

  const handleOptionClick = (action, value) => {
    switch (action) {
      case 'analyze':
        router.visit(`/analysis?type=${value}`)
        break
      case 'research':
        _hRT(value)
        break
      case 'restart':
        setIsInputEnabled(false)
        router.visit('/analysis', { preserveState: false })
        break
      default:
        break
    }
  }

  const handleSubmit = () => {
    if (!_i.trim()) return

    const userMessage = _hMsg("user", _i)
    setMessages(prev => [...prev, userMessage])
    setAiThinking(true)

    router.post(`${_api.base}/${_api.endpoints.custom}`, {
      a: 'custom_analysis',
      query: _i
    }, {
      preserveState: true,
      preserveScroll: true,
    })

    setInput("")
  }

  return (
    <AdminPanelLayout title={btoa("AI Research")}>
      <div className={`min-h-screen ${_getRandomClass()}`}>
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          {_msgs.length === 0 && (
            <>
              <h1 className="text-3xl md:text-4xl font-medium text-white text-center tracking-tight mb-10">
                How can I assist you?
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2 sm:px-6">
                {_rt.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.t}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    <Card 
                      className={`bg-neutral-900/50 border-neutral-800/50 transition-all duration-300 cursor-pointer group h-full ${
                        !_ie ? 'opacity-50 cursor-not-allowed' : 'hover:bg-neutral-800/50 hover:scale-[1.02]'
                      }`}
                      onClick={() => !_ie && _hRT(suggestion.t)}
                    >
                      <button 
                        className="p-4 sm:p-5 text-left w-full h-full flex flex-col gap-3"
                        disabled={!_ie}
                      >
                        <div className="flex items-center gap-3">
                          <suggestion.i
                            className="h-7 w-7 sm:h-6 sm:w-6"
                            style={{ color: suggestion.c }}
                          />
                          <h3 className="font-medium text-white text-base sm:text-lg">
                            {suggestion.t}
                          </h3>
                        </div>
                        <p className="text-sm sm:text-[15px] text-neutral-400 leading-relaxed">
                          {suggestion.d}
                        </p>
                      </button>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </>
          )}
          {_msgs.length > 0 && (
            <ScrollArea className="h-[60vh] pr-4 mb-6" ref={_sRef}>
              <div className="space-y-6">
                {_msgs.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "assistant" && (
                      <div className="w-8 flex justify-center">
                        <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                          <Robot className="w-5 h-5 text-white" />
                        </Avatar>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white"
                          : "bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700"
                      }`}
                    >
                      <div className="space-y-4">
                        {typeof message.content === 'string' ? (
                          <p className="text-lg whitespace-pre-line">{message.content}</p>
                        ) : message.isJson ? (
                          <div className="space-y-6">
                            {/* Table */}
                            {message.content.table && (
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      {message.content.table.headers.map((header, index) => (
                                        <TableHead key={index} className="text-white font-semibold">
                                          {header}
                                        </TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {message.content.table.rows.map((row, index) => (
                                      <TableRow key={index} className="hover:bg-neutral-800/50">
                                        {row.map((cell, cellIndex) => (
                                          <TableCell key={cellIndex} className="text-white">
                                            {cell}
                                          </TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            )}

                            {/* Detailed Analysis */}
                            {message.content.analysis && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(message.content.analysis).map(([symbol, analysis]) => (
                                  <Card key={symbol} className="p-4 bg-neutral-900/50 border-neutral-800 hover:bg-neutral-800/50 transition-colors">
                                    <h3 className="text-lg font-semibold mb-2 text-white flex items-center gap-2">
                                      {analysis.name} 
                                      <span className="text-neutral-400">({symbol})</span>
                                      <span className={`ml-auto text-sm px-2 py-1 rounded ${
                                        analysis.recommendation === 'Buy' ? 'bg-green-500/20 text-green-400' :
                                        analysis.recommendation === 'Hold' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-red-500/20 text-red-400'
                                      }`}>
                                        {analysis.recommendation}
                                      </span>
                                    </h3>
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="text-sm font-medium text-green-400 mb-1">Strengths</h4>
                                        <ul className="list-disc list-inside text-sm text-neutral-300">
                                          {analysis.strengths.map((strength, index) => (
                                            <li key={index}>{strength}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-medium text-red-400 mb-1">Weaknesses</h4>
                                        <ul className="list-disc list-inside text-sm text-neutral-300">
                                          {analysis.weaknesses.map((weakness, index) => (
                                            <li key={index}>{weakness}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            )}

                            {/* Summary and Final Recommendation */}
                            {(message.content.summary || message.content.recommendation) && (
                              <div className="space-y-4 mt-6">
                                {message.content.summary && (
                                  <Card className="p-4 bg-neutral-900/50 border-neutral-800">
                                    <h3 className="text-lg font-semibold mb-2 text-white">Summary</h3>
                                    <p className="text-neutral-300">{message.content.summary}</p>
                                  </Card>
                                )}
                                {message.content.recommendation && (
                                  <Card className="p-4 bg-neutral-900/50 border-neutral-800">
                                    <h3 className="text-lg font-semibold mb-2 text-white">Final Recommendation</h3>
                                    <p className="text-neutral-300">{message.content.recommendation}</p>
                                  </Card>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-lg whitespace-pre-line">{JSON.stringify(message.content, null, 2)}</p>
                        )}
                        {message.options && (
                          <div className="flex flex-wrap gap-2 mt-4">
                            {message.options.map((option, index) => (
                              <Button
                                key={index}
                                onClick={() => handleOptionClick(option.action, option.value)}
                                variant={option.variant || 'secondary'}
                                size="lg"
                                disabled={message.id !== _msgs[_msgs.length - 1].id}
                                className={`flex-1 min-w-[120px] ${
                                  message.id !== _msgs[_msgs.length - 1].id ? 'opacity-50 cursor-not-allowed' : ''
                                } ${
                                  option.action === 'analyze' 
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : ''
                                }`}
                              >
                                {option.text}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {message.type === "user" && (
                      <div className="w-8 flex justify-center">
                        <Avatar className="w-8 h-8 border bg-gradient-to-br from-purple-500 to-purple-700">
                          <span className="text-xs text-white font-medium flex items-center ml-[4px]">You</span>
                        </Avatar>
                      </div>
                    )}
                  </div>
                ))}
                {_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 flex justify-center">
                      <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                        <Robot className="w-5 h-5 text-white" />
                      </Avatar>
                    </div>
                    <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700 rounded-2xl p-4">
                      <div className="flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>●</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={_bRef} />
              </div>
            </ScrollArea>
          )}
          <div className="relative mt-8">
            <Textarea
              value={_i}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="Please select one of the research options above..."
              className={`w-full min-h-[130px] px-6 py-5 bg-neutral-900/90 backdrop-blur-sm border-border/5 
                         text-white placeholder:text-neutral-400 placeholder:text-lg resize-none rounded-xl
                         focus:ring-1 focus:ring-white/10 transition-all duration-200 text-lg leading-relaxed
                         ${!_ie ? 'opacity-50 cursor-not-allowed' : ''}`}
              maxLength={500}
              disabled={!_ie}
            />
            <div className="absolute bottom-5 right-5 flex items-center gap-4">
              <span className="text-base text-neutral-500 font-medium tracking-wide">
                {_i.length}/500
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSubmit}
                className={`h-11 w-11 rounded-lg bg-white/5 hover:bg-white/10 text-white 
                           transition-all duration-300 hover:scale-110 ${
                             !_ie ? 'opacity-50 cursor-not-allowed' : ''
                           }`}
                disabled={!_ie}
              >
                <Send className="h-6 w-6 rotate-45" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  )
}

const _getRandomClass = () => {
  const _prefix = Math.random().toString(36).substring(7)
  return `${_prefix}-container bg-black/95 antialiased`
}

const _hMsg = (type, content) => ({
  id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  type: type,
  content: content
})

const _api = {
  base: '/api/v1',
  endpoints: {
    analysis: `${Math.random().toString(36).substr(2, 9)}`,
    custom: `${Math.random().toString(36).substr(2, 9)}`
  }
} 