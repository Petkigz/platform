-- Working drafts for the owner to review and edit in the visual help editor.
-- None are published by this migration; the existing RLS keeps drafts private
-- to platform admins. They describe navigation, not religious rulings, and do
-- not promise that optional features or providers are available.
insert into public.platform_help_articles (title, body, keywords, status) values
('How do I change the interface language?',
 'Open Language to choose the interface language. Your choice is saved in this browser, so another device may need its own selection. This changes the interface, not the language of a course.',
 'language translation browser device change', 'draft'),
('How do I update my profile?',
 'Sign in and open Account settings to edit the profile details offered there. Your sign-in address is shown for reference and is not changed on that page.',
 'account settings profile name email', 'draft'),
('Where can a guardian find family learning?',
 'Sign in and open Family to see the family information available to your account. Guardian verification and other permissions may be required before particular actions are available. Contact support when it is open if you need help.',
 'guardian child family verification parent learner', 'draft'),
('How do saved lessons work?',
 'When offline saving is enabled and you have the required Plus entitlement, a lesson may offer a save option. Open On this device to see or remove lessons saved in that browser. Saved access is time-limited; a saved lesson is not a permanent owned copy.',
 'offline download save device plus lesson', 'draft'),
('Where can I find my orders?',
 'Sign in and open your orders to see the orders available to your account. An order or refund request is not itself confirmation that money has moved. If something looks wrong, contact support when it is open.',
 'order receipt payment refund money', 'draft'),
('What can the study assistant answer?',
 'When the study assistant is enabled, it searches material you are allowed to open and shows matching lesson citations. It does not generate an answer. Questions asking for a religious ruling should go to an authorized teacher; a refusal does not guarantee the platform has delivered the question to one.',
 'study assistant question citations teacher ruling religion search', 'draft'),
('How can a teacher add a transcript?',
 'In Teaching, open your course and an editable draft lesson to add optional transcript text. Submitted versions are frozen. The text should be material you are authorized to use; the feature does not transcribe audio automatically.',
 'teacher author transcript lesson video captions', 'draft'),
('How do I report a problem with a lesson?',
 'Open the lesson and look for Report a problem. Explain the issue clearly without including unnecessary private information. Availability depends on the lesson and the platform settings; if you cannot report there, use support when it is open.',
 'report lesson mistake problem review support', 'draft');
