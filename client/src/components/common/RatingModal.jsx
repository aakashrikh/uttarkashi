import React, { useState } from 'react';

const RatingModal = ({ isOpen, onSubmit, role }) => {
    const [rating, setRating] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rating);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center transform transition-all scale-100">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Call Ended</h3>
                <p className="text-gray-500 mb-6">
                    {role === 'dm'
                        ? 'How would you rate this interaction?'
                        : 'How was your experience with the DM?'}
                </p>

                <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-4xl transition-transform hover:scale-110 focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-200'
                                }`}
                        >
                            ★
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={rating === 0}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${rating > 0
                        ? 'bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-primary-600/30'
                        : 'bg-gray-300 cursor-not-allowed'
                        }`}
                >
                    Submit Feedback
                </button>
            </div>
        </div>
    );
};

export default RatingModal;
