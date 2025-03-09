import React, { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, BotIcon as Robot, Repeat, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { motion } from "framer-motion"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AdminPanelLayout } from "@/components/admin-panel/admin-panel-layout"
import { router, Link } from '@inertiajs/react'

export default function ChatInterface({ message, token, type }) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState([])
  const [aiThinking, setAiThinking] = useState(false)
  const scrollRef = useRef(null)

  const suggestions = [
    {
      title: "AI Research Assistant",
      description: "Get AI-powered research and analysis for Sonic tokens based on market conditions.",
      icon: Sparkles,
      color: "#9646ff",
      link: "/ai-research"
    },
    {
      title: "Sonic Trading Assistant",
      description: "Instantly buy or sell any token on Sonic with AI guidance.",
      icon: Repeat,
      color: "#2196f3",
      link: "/buy-instant"
    },
    {
      title: "Market Analysis",
      description: "Track top gainers and losers on Sonic in real-time.",
      icon: TrendingUp,
      color: "#ff9800",
      link: "/market-research"
    },
    {
      title: "Portfolio Manager",
      description: "AI-powered portfolio management and DCA strategies on Sonic.",
      icon: Robot,
      color: "#00c853",
      comingSoon: true
    }
  ]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (message && type) {
      setAiThinking(false)
      const aiResponse = {
        id: Date.now().toString(),
        type: "assistant",
        content: message
      }
      setMessages(prev => [...prev, aiResponse])
    }
  }, [message, type])

  const handleAction = async (type, data) => {
    setAiThinking(true)
    router.post('/api/v1/agent', { type, data }, {
      preserveState: true
    })
  }

  return (
    <AdminPanelLayout title="Sonic Assistant">
      <div className="min-h-screen bg-black/95 antialiased">
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
          {messages.length === 0 && (
            <>
              <h1 className="text-3xl md:text-4xl font-medium text-white text-center tracking-tight mb-10">
                How can I help you with Sonic today?
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-2 sm:px-6">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={suggestion.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                  >
                    {suggestion.comingSoon ? (
                      <Card className="bg-neutral-900/50 border-neutral-800/50 transition-all duration-300 h-full relative">
                        <div className="p-4 sm:p-5 text-left w-full h-full flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <suggestion.icon
                              className="h-7 w-7 sm:h-6 sm:w-6"
                              style={{ color: suggestion.color }}
                            />
                            <h3 className="font-medium text-white text-base sm:text-lg">
                              {suggestion.title}
                              <span className="ml-2 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full">
                                Coming Soon
                              </span>
                            </h3>
                          </div>
                          <p className="text-sm text-neutral-400 leading-relaxed">
                            {suggestion.description}
                          </p>
                        </div>
                      </Card>
                    ) : (
                      <Link href={suggestion.link}>
                        <Card className="bg-neutral-900/50 border-neutral-800/50 hover:bg-neutral-800/50 transition-all duration-300 cursor-pointer h-full hover:scale-[1.02]">
                          <div className="p-4 sm:p-5 text-left w-full h-full flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <suggestion.icon
                                className="h-7 w-7 sm:h-6 sm:w-6"
                                style={{ color: suggestion.color }}
                              />
                              <h3 className="font-medium text-white text-base sm:text-lg">
                                {suggestion.title}
                              </h3>
                            </div>
                            <p className="text-sm text-neutral-400 leading-relaxed">
                              {suggestion.description}
                            </p>
                          </div>
                        </Card>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            </>
          )}
          
          {messages.length > 0 && (
            <ScrollArea className="h-[60vh] pr-4 mb-6" ref={scrollRef}>
              <div className="space-y-6">
                {messages.map(message => (
                  <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.type === "assistant" && (
                      <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                        <Robot className="w-5 h-5 text-white" />
                      </Avatar>
                    )}
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      message.type === "user"
                        ? "bg-gradient-to-r from-purple-600 to-purple-800 text-white"
                        : "bg-gradient-to-r from-neutral-800 to-neutral-900 text-white border border-neutral-700"
                    }`}>
                      {message.content}
                    </div>
                    {message.type === "user" && (
                      <Avatar className="w-8 h-8 border bg-gradient-to-br from-purple-500 to-purple-700">
                        <span className="text-xs text-white font-medium">You</span>
                      </Avatar>
                    )}
                  </div>
                ))}
                {aiThinking && (
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 border bg-gradient-to-br from-red-500 via-orange-500 to-blue-500">
                      <Robot className="w-5 h-5 text-white" />
                    </Avatar>
                    <div className="bg-neutral-800 text-white border border-neutral-700 rounded-2xl p-4">
                      <div className="flex gap-1">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
                        <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>●</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <div className="relative mt-8">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask me anything about Sonic..."
              className="w-full min-h-[130px] px-6 py-5 bg-neutral-900/90 text-white placeholder:text-neutral-400 rounded-xl"
              maxLength={500}
            />
            <Button
              onClick={() => handleAction('message', input)}
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
