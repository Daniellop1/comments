import { SmileyIcon } from '@primer/octicons-react';
import { useCallback, useContext, useState } from 'react';
import { AuthContext } from '../lib/context';
import { useComponentVisible } from '../lib/hooks';
import { IReactionGroups } from '../lib/types/adapter';
import { Reaction, Reactions } from '../lib/reactions';
import { toggleReaction } from '../services/github/toggleReaction';
import { Trans, useGiscusTranslation } from '../lib/i18n';

interface IReactButtonsProps {
  reactionGroups?: IReactionGroups;
  subjectId?: string;
  onReact: (content: Reaction, promise: Promise<unknown>) => void;
  variant?: 'groupsOnly' | 'popoverOnly' | 'all';
  onDiscussionCreateRequest?: () => Promise<string>;
}

function PopupInfo({
  isLoggedIn,
  isLoading,
  current,
  loginUrl,
}: {
  isLoggedIn: boolean;
  isLoading: boolean;
  current: Reaction;
  loginUrl: string;
}) {
  const { t } = useGiscusTranslation();
  if (isLoading) return <p className="m-2">{t('pleaseWait')}</p>;
  if (!isLoggedIn)
    return (
      <p className="m-2">
        <Trans
          i18nKey="common:signInToAddYourReaction"
          components={{ a: <a href={loginUrl} className="color-text-link" target="_top" /> }}
        />
      </p>
    );
  return (
    <p className="m-2 overflow-hidden whitespace-nowrap overflow-ellipsis">
      {current ? t(current) : t('pickYourReaction')}
    </p>
  );
}

export default function ReactButtons({
  reactionGroups,
  subjectId,
  onReact,
  variant = 'all',
  onDiscussionCreateRequest,
}: IReactButtonsProps) {
  const { t } = useGiscusTranslation();
  const [current, setCurrent] = useState<Reaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ref, isOpen, setIsOpen] = useComponentVisible<HTMLDivElement>(false);
  const { token, origin, getLoginUrl } = useContext(AuthContext);
  const loginUrl = getLoginUrl(origin);

  const togglePopover = useCallback(() => setIsOpen(!isOpen), [isOpen, setIsOpen]);

  const react = useCallback(
    async (content: Reaction) => {
      if (isSubmitting || (!subjectId && !onDiscussionCreateRequest)) return;
      setIsSubmitting(!subjectId);

      const id = subjectId ? subjectId : await onDiscussionCreateRequest();

      onReact(
        content,
        toggleReaction(
          { content, subjectId: id },
          token,
          !!reactionGroups?.[content]?.viewerHasReacted,
        ).then(() => setIsSubmitting(false)),
      );
    },
    [isSubmitting, onDiscussionCreateRequest, onReact, reactionGroups, subjectId, token],
  );

  const createReactionButton = useCallback(
    ([key, { count, viewerHasReacted }]: [Reaction, typeof reactionGroups[Reaction]]) => (
      <button
        aria-label={t('addTheReaction', { reaction: t(key) })}
        key={key}
        className={`gsc-direct-reaction-button gsc-social-reaction-summary-item ${
          viewerHasReacted ? 'has-reacted' : ''
        }${!token ? ' cursor-not-allowed' : ''}`}
        disabled={!token}
        title={
          token
            ? t('peopleReactedWith', {
                count,
                reaction: t(key),
                emoji: t('emoji'),
              })
            : t('youMustBeSignedInToAddReactions')
        }
        onClick={() => react(key)}
      >
        <span className="inline-block w-4 h-4">{Reactions[key]}</span>
        <span className="text-xs ml-[2px] px-1">{count}</span>
      </button>
    ),
    [react, token, t],
  );

  const directReactionButtons =
    variant !== 'popoverOnly'
      ? Object.entries(reactionGroups || {})
          .filter(([, { count }]) => count > 0)
          .map(createReactionButton)
      : [];

  return (
    <>
      {variant !== 'groupsOnly' ? (
        <div ref={ref} className="gsc-reactions-menu">
          <button
            aria-label={t('addReactions')}
            className={`link-secondary gsc-reactions-button gsc-social-reaction-summary-item ${
              variant === 'popoverOnly' ? 'popover-only' : 'popover'
            }`}
            onClick={togglePopover}
          >
            <SmileyIcon size={16} />
          </button>
          <div
            className={`color-border-primary color-text-secondary color-bg-overlay gsc-reactions-popover ${
              isOpen ? ' open' : ''
            } ${variant === 'popoverOnly' ? 'popover-only' : 'popover'}`}
          >
            <PopupInfo
              isLoading={isSubmitting}
              isLoggedIn={!!token}
              loginUrl={loginUrl}
              current={current}
            />
            <div className="my-2 border-t color-border-primary" />
            <div className="m-2">
              {Object.entries(Reactions).map(([key, emoji]) => (
                <button
                  aria-label={t('addTheReaction', { reaction: t(key as Reaction) })}
                  key={key}
                  type="button"
                  className={`gsc-emoji-button${
                    reactionGroups?.[key]?.viewerHasReacted
                      ? ' has-reacted color-bg-info color-border-tertiary'
                      : ''
                  }${!token ? ' no-token' : ''}`}
                  onClick={() => {
                    react(key as Reaction);
                    togglePopover();
                  }}
                  onMouseEnter={() => setCurrent(key as Reaction)}
                  onFocus={() => setCurrent(key as Reaction)}
                  onMouseLeave={() => setCurrent(null)}
                  onBlur={() => setCurrent(null)}
                  disabled={!token}
                >
                  <span className="gsc-emoji">{emoji}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {variant !== 'popoverOnly' ? (
        <div className="gsc-direct-reaction-buttons">{directReactionButtons}</div>
      ) : null}
    </>
  );
}
