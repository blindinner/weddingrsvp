'use client';

import { useState } from 'react';
import Image from 'next/image';

type Status = 'attending' | 'not_attending';

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  status: Status | null;
  actualGuestCount: number;
  message: string;
}

export default function RSVPPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    status: null,
    actualGuestCount: 1,
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      setError('נא למלא את כל השדות הנדרשים');
      return;
    }

    if (!formData.status) {
      setError('נא לבחור האם תגיעו');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          status: formData.status,
          actualGuestCount: formData.status === 'attending' ? formData.actualGuestCount : null,
          dietary: null,
          message: formData.message.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'שגיאה בשליחת הטופס');
      }

      setSubmittedStatus(formData.status);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת הטופס');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setSubmittedStatus(null);
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      status: null,
      actualGuestCount: 1,
      message: '',
    });
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2]">
      {/* Invitation Image */}
      <section className="w-full max-w-lg mx-auto px-4 pt-8">
        <div className="relative w-full aspect-[3/4]">
          <Image
            src="/invite.jpg"
            alt="הזמנה לחתונה של נועה ואריאל"
            fill
            className="object-contain"
            priority
          />
        </div>
      </section>

      {/* Form Section */}
      <section className="px-4 py-12 max-w-md mx-auto">
        {!submitted ? (
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-[#8B9A7A]/20 shadow-lg shadow-[#8B9A7A]/10">
            <h2 className="text-2xl font-medium text-[#3D3D3D] text-center mb-2">
              אישור הגעה
            </h2>
            <p className="text-[#6B6B6B] text-center mb-8">
              נשמח לדעת אם תגיע/י
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                  שם פרטי *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                  שם משפחה *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                  מספר טלפון *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="050-1234567"
                  className="w-full"
                  dir="ltr"
                  required
                />
              </div>

              {/* Attendance Status */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-3">
                  האם תגיע/י? *
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'attending'}
                      onChange={() => setFormData({ ...formData, status: 'attending' })}
                    />
                    <span className="text-[#3D3D3D]">מגיע/ה</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'not_attending'}
                      onChange={() => setFormData({ ...formData, status: 'not_attending' })}
                    />
                    <span className="text-[#3D3D3D]">לא מגיע/ה</span>
                  </label>
                </div>
              </div>

              {/* Guest Count - only visible if attending */}
              {formData.status === 'attending' && (
                <div>
                  <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                    כמה אורחים? (כולל אותך)
                  </label>
                  <select
                    value={formData.actualGuestCount}
                    onChange={(e) => setFormData({ ...formData, actualGuestCount: parseInt(e.target.value) })}
                    className="w-full"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              )}


              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-[#3D3D3D] mb-2">
                  ברכה לזוג
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="ברכה לחתן והכלה (אופציונלי)"
                  rows={3}
                  className="w-full resize-none"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full text-lg"
              >
                {isSubmitting ? 'שולח...' : 'שליחה'}
              </button>
            </form>
          </div>
        ) : (
          /* Thank you state */
          <div className="bg-white rounded-2xl p-8 border border-[#8B9A7A]/20 shadow-lg shadow-[#8B9A7A]/10 text-center">
            {submittedStatus === 'attending' && (
              <>
                <p className="text-3xl mb-4">תודה שאישרתם ❤️</p>
                <p className="text-[#6B6B6B] text-lg">נתראה ב-19 ביוני</p>
              </>
            )}
            {submittedStatus === 'not_attending' && (
              <>
                <p className="text-3xl mb-4">תודה על העדכון 💛</p>
                <p className="text-[#6B6B6B] text-lg">נחסר לנו</p>
              </>
            )}

            <button
              onClick={resetForm}
              className="mt-8 text-[#8B9A7A] underline underline-offset-4 hover:text-[#6B7A5A] transition-colors"
            >
              לעדכון התשובה — שליחת טופס מחדש
            </button>
          </div>
        )}
      </section>

      {/* Footer spacing */}
      <div className="h-12" />
    </main>
  );
}
