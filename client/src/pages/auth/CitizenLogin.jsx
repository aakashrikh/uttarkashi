import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

import { uttarkashiData } from '../../data/uttarkashi_data';

const CitizenLogin = () => {
    const [mobile, setMobile] = useState('');
    const [name, setName] = useState('');

    // Location State
    const [selectedDistrict, setSelectedDistrict] = useState('Uttarkashi'); // Default fixed
    const [selectedBlock, setSelectedBlock] = useState('');
    const [selectedVillage, setSelectedVillage] = useState('');
    const [availableVillages, setAvailableVillages] = useState([]);

    const [step, setStep] = useState(1); // 1: Details, 2: OTP
    const [otp, setOtp] = useState('');

    const { loginUser } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Reset village when block changes
    const handleBlockChange = (e) => {
        const blockName = e.target.value;
        setSelectedBlock(blockName);
        setSelectedVillage('');

        if (blockName) {
            const blockData = uttarkashiData.blocks.find(b => b.name === blockName);
            setAvailableVillages(blockData ? blockData.villages : []);
        } else {
            setAvailableVillages([]);
        }
    };

    const handleSendOtp = (e) => {
        e.preventDefault();
        if (mobile.length === 10 && name && selectedBlock && selectedVillage) {
            setStep(2);
        } else {
            alert(t('fillFieldsAlert'));
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        // Mock OTP verification
        if (otp.length === 4) {
            await loginUser({
                name,
                mobile,
                district: selectedDistrict,
                block: selectedBlock,
                village: selectedVillage,
                role: 'citizen'
            });
            navigate('/dashboard');
        } else {
            alert(t('invalidOtpAlert'));
        }
    };

    return (
        <div className="p-6">
            <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800">{t('citizenLogin')}</h2>
                <p className="text-gray-500 text-sm">{t('verifyIdentity')}</p>
            </div>

            {step === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('fullName')}</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('enterName')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('mobileNumber')}</label>
                        <input
                            type="tel"
                            required
                            maxLength={10}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={mobile}
                            onChange={e => setMobile(e.target.value)}
                            placeholder={t('mobilePlaceholder')}
                        />
                    </div>

                    {/* Location Dropdowns */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('district')}</label>
                            <select
                                disabled
                                className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-600 outline-none cursor-not-allowed"
                                value={selectedDistrict}
                            >
                                <option value="Uttarkashi">Uttarkashi</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('block')}</label>
                            <select
                                required
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                value={selectedBlock}
                                onChange={handleBlockChange}
                            >
                                <option value="">{t('selectBlock')}</option>
                                {uttarkashiData.blocks.map(block => (
                                    <option key={block.name} value={block.name}>{block.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('village')}</label>
                            <select
                                required
                                disabled={!selectedBlock}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none ${!selectedBlock ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
                                value={selectedVillage}
                                onChange={e => setSelectedVillage(e.target.value)}
                            >
                                <option value="">{t('selectVillage')}</option>
                                {availableVillages.map(village => (
                                    <option key={village} value={village}>{village}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                    >
                        {t('sendOtp')}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center text-sm text-gray-600 mb-4">
                        {t('otpSentTo')} +91 {mobile}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('enterOtp')}</label>
                        <input
                            type="text"
                            required
                            maxLength={4}
                            className="w-full text-center text-2xl tracking-widest px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                            value={otp}
                            onChange={e => setOtp(e.target.value)}
                            placeholder={t('otpPlaceholder')}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-center">{t('otpDemo')}</p>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
                    >
                        {t('verifyLogin')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full text-primary-600 text-sm py-2 hover:underline"
                    >
                        {t('changeDetails')}
                    </button>
                </form>
            )}
        </div>
    );
};

export default CitizenLogin;
