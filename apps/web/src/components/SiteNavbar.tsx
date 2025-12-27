import {
    Badge,
    Button,
    Flex,
    Switch,
    Text,
    Title,
} from '@tremor/react'
import { useState } from 'react'

import {
    MobileNav,
    MobileNavHeader,
    MobileNavMenu,
    MobileNavToggle,
    NavBody,
    NavItems,
    Navbar,
} from '@/components/ui/resizable-navbar'
import { useThemeToggle } from '@/hooks/useThemeToggle'

const slateBadgeClassName =
    '!bg-slate-200 !bg-opacity-100 !text-slate-900 !ring-slate-300 dark:!bg-slate-800 dark:!bg-opacity-100 dark:!text-slate-100 dark:!ring-slate-700'

const navItems = [
    { name: 'Leaderboard', link: '/' },
    { name: 'About', link: '/about' },
]

export function SiteNavbar() {
    const { isDark, setIsDark } = useThemeToggle()
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

    return (
        <Navbar>
            <NavBody>
                <Flex alignItems="center" className="gap-3" justifyContent="start">
                    <div>
                        <Title className="font-display text-base">Pokébench</Title>
                    </div>
                </Flex>
                <NavItems
                    items={navItems}
                    onItemClick={() => setIsMobileNavOpen(false)}
                />
                <Flex alignItems="center" className="gap-3" justifyContent="end">
                    <Button
                        size="sm"
                        color="cyan"
                        onClick={() =>
                            (window.location.href = 'mailto:alex@bottlenecklabs.com')
                        }
                    >
                        Research Inquiries
                    </Button>
                    <label className="flex items-center gap-2">
                        <Text className="text-xs">Dark mode</Text>
                        <Switch checked={isDark} onChange={setIsDark} color="cyan" />
                    </label>
                </Flex>
            </NavBody>
            <MobileNav>
                <MobileNavHeader>
                    <Flex alignItems="center" className="gap-3" justifyContent="start">
                        <Badge size="lg" color="slate" className={slateBadgeClassName}>
                            PB
                        </Badge>
                        <div>
                            <Title className="font-display text-base">Pokebench</Title>
                            <Text className="text-xs">
                                Competitive Gen9 RandBats benchmark
                            </Text>
                        </div>
                    </Flex>
                    <div className="flex items-center gap-3">
                        <MobileNavToggle
                            isOpen={isMobileNavOpen}
                            onClick={() => setIsMobileNavOpen((prev) => !prev)}
                        />
                    </div>
                </MobileNavHeader>
                <MobileNavMenu isOpen={isMobileNavOpen}>
                    {navItems.map((item) => (
                        <a
                            key={item.name}
                            href={item.link}
                            className="text-sm text-neutral-600 dark:text-neutral-200"
                            onClick={() => setIsMobileNavOpen(false)}
                        >
                            {item.name}
                        </a>
                    ))}
                    <Button
                        size="sm"
                        color="cyan"
                        className="w-full"
                        onClick={() =>
                            (window.location.href = 'mailto:alex@bottlenecklabs.com')
                        }
                    >
                        Research Inquiries
                    </Button>
                    <div className="flex w-full items-center justify-between">
                        <Text className="text-xs">Dark mode</Text>
                        <Switch checked={isDark} onChange={setIsDark} color="cyan" />
                    </div>
                </MobileNavMenu>
            </MobileNav>
        </Navbar>
    )
}

