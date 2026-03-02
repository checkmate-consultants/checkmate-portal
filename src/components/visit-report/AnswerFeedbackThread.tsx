import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button.tsx'
import {
  addAnswerFeedback,
  fetchAnswerFeedback,
  type AnswerFeedbackItem,
} from '../../data/companyManagement.ts'
import './answer-feedback-thread.css'

/** Comment bubble icon for "open comments" trigger (e.g. opens modal). */
export function CommentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

type Props = {
  visitId: string
  focusAreaId: string
  questionId: string
  /** When true, show inline form to add feedback (company/super admin, not shopper). */
  canComment: boolean
  /** When provided, comments are collapsed by default; user clicks to expand. */
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AnswerFeedbackThread({
  visitId,
  focusAreaId,
  questionId,
  canComment,
  isOpen = true,
  onOpenChange,
}: Props) {
  const { t } = useTranslation()
  const [thread, setThread] = useState<AnswerFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newBody, setNewBody] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const collapsed = onOpenChange != null && !isOpen

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAnswerFeedback(visitId, focusAreaId, questionId)
      setThread(data)
    } catch {
      setThread([])
    } finally {
      setLoading(false)
    }
  }, [visitId, focusAreaId, questionId])

  useEffect(() => {
    load()
  }, [load])

  const prevCollapsed = useRef(collapsed)
  useEffect(() => {
    if (prevCollapsed.current === false && collapsed === true) load()
    prevCollapsed.current = collapsed
  }, [collapsed, load])

  const commentCount = thread.reduce((n, item) => n + 1 + (item.replies?.length ?? 0), 0)

  const handleAdd = async () => {
    const body = newBody.trim()
    if (!body || submitting || !canComment) return
    setSubmitting(true)
    try {
      await addAnswerFeedback(visitId, focusAreaId, questionId, body)
      setNewBody('')
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    const body = replyBody.trim()
    if (!body || submitting || !canComment) return
    setSubmitting(true)
    try {
      await addAnswerFeedback(visitId, focusAreaId, questionId, body, parentId)
      setReplyingTo(null)
      setReplyBody('')
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  const authorLabel = (item: AnswerFeedbackItem) =>
    item.authorFullName || item.authorEmail || t('superAdmin.visitReport.feedback.anonymous')

  if (collapsed) {
    return (
      <button
        type="button"
        className="answer-feedback-thread__trigger"
        onClick={() => onOpenChange?.(true)}
        aria-label={t('superAdmin.visitReport.feedback.viewComments')}
        title={t('superAdmin.visitReport.feedback.viewComments')}
      >
        <CommentIcon className="answer-feedback-thread__trigger-icon" />
        <span className="answer-feedback-thread__count" aria-hidden>
          {commentCount}
        </span>
      </button>
    )
  }

  if (loading) {
    return (
      <div className="answer-feedback-thread answer-feedback-thread--loading">
        {t('superAdmin.visitReport.feedback.loading')}
      </div>
    )
  }

  return (
    <div className="answer-feedback-thread">
      {onOpenChange && (
        <Button
          type="button"
          variant="ghost"
          className="answer-feedback-thread__toggle answer-feedback-thread__toggle--hide"
          onClick={() => onOpenChange(false)}
        >
          {t('superAdmin.visitReport.feedback.hideComments')}
        </Button>
      )}
      {thread.length === 0 && !canComment ? null : (
        <>
          <div className="answer-feedback-thread__list">
            {thread.map((item) => (
              <div key={item.id} className="answer-feedback-thread__item">
                <div className="answer-feedback-thread__meta">
                  <span className="answer-feedback-thread__author">{authorLabel(item)}</span>
                  <span className="answer-feedback-thread__date">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="answer-feedback-thread__body">{item.body}</p>
                {canComment && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="answer-feedback-thread__reply-btn"
                    onClick={() => setReplyingTo(item.id)}
                  >
                    {t('superAdmin.visitReport.feedback.reply')}
                  </Button>
                )}
                {replyingTo === item.id && (
                  <div className="answer-feedback-thread__reply-form">
                    <textarea
                      className="answer-feedback-thread__input"
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder={t('superAdmin.visitReport.feedback.replyPlaceholder')}
                      rows={2}
                    />
                    <div className="answer-feedback-thread__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyBody('')
                        }}
                      >
                        {t('companyUserManagement.forms.cancel')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleReply(item.id)}
                        disabled={!replyBody.trim() || submitting}
                      >
                        {t('superAdmin.visitReport.feedback.reply')}
                      </Button>
                    </div>
                  </div>
                )}
                {item.replies.length > 0 && (
                  <div className="answer-feedback-thread__replies">
                    {item.replies.map((reply) => (
                      <div key={reply.id} className="answer-feedback-thread__item answer-feedback-thread__item--reply">
                        <div className="answer-feedback-thread__meta">
                          <span className="answer-feedback-thread__author">{authorLabel(reply)}</span>
                          <span className="answer-feedback-thread__date">
                            {new Date(reply.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="answer-feedback-thread__body">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {canComment && (
            <div className="answer-feedback-thread__add">
              <textarea
                className="answer-feedback-thread__input"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder={t('superAdmin.visitReport.feedback.placeholder')}
                rows={2}
              />
              <Button
                type="button"
                onClick={handleAdd}
                disabled={!newBody.trim() || submitting}
              >
                {t('superAdmin.visitReport.feedback.add')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
