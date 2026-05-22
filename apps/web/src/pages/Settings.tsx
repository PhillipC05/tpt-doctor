import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardContent, Button, Select, Badge } from '../components/ui';
import { useThemeStore } from '../stores/themeStore';
import { useLanguageStore, SupportedLanguage } from '../stores/languageStore';
import { Moon, Sun, Monitor, Globe, User, Bell, Shield, Palette, Check } from 'lucide-react';
import { cn } from '../lib/utils';

const languages: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const sections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'language', label: 'Language', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const { language, setLanguage } = useLanguageStore();
  const [activeSection, setActiveSection] = useState('appearance');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('settings.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="w-full lg:w-56 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeSection === 'appearance' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.appearance')}
                </h2>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('settings.theme')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { value: 'light', label: t('settings.theme.light'), icon: Sun },
                      { value: 'dark', label: t('settings.theme.dark'), icon: Moon },
                      { value: 'system', label: t('settings.theme.system'), icon: Monitor },
                    ].map((option) => {
                      const Icon = option.icon;
                      const isActive = theme === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as any)}
                          className={cn(
                            'relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all',
                            isActive
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-2 right-2">
                              <Check className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          <Icon className={cn('h-8 w-8', isActive ? 'text-blue-600' : 'text-gray-400')} />
                          <span className={cn('text-sm font-medium', isActive ? 'text-blue-700' : 'text-gray-600')}>
                            {option.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            {option.value === 'system' ? 'Follows system' : option.value === 'dark' ? 'Dark background' : 'Light background'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'language' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.language')}
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
                        language === lang.code
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{lang.flag}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lang.label}
                        </span>
                      </div>
                      {language === lang.code && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.profile')}
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Profile settings coming soon...</p>
              </CardContent>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.notifications')}
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Notification preferences coming soon...</p>
              </CardContent>
            </Card>
          )}

          {activeSection === 'security' && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('settings.security')}
                </h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">Security settings coming soon...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}