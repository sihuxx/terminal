const $ = (e) => document.querySelector(e)
const $$ = (e) => [...document.querySelectorAll(e)]
const input = $(".commandInput")
const output = $(".output")

function print(text) {
    const p = document.createElement('p')
    p.innerHTML = text
    p.style.animation = 'fadeInLine 0.3s ease'
    output.appendChild(p)
    output.scrollTop = output.scrollHeight;
}

function printLine(line) {
    let i = 0
    function next() {
        if(i < line.length) {
            print(line[i])
            i++
            setTimeout(next, 180)
        }
    }
    next()
}

const bootText = [
    '<span style="color:#8EC489">portfolio v1.0.0</span>',
    '<span style="color:#9A9E94">──────────────────────</span>',
    'Type <span style="color:#FFD84D">help</span> to see available commands.'
]

let i = 0

function boot() {
    if(i < bootText.length) {
        print(bootText[i])
        i++
        setTimeout(boot, 400)
    }
}
boot()

input.addEventListener("keydown", (e) => {
    if(e.key === "Enter") {
        const cmd = input.value.trim()
        if (!cmd) return
        print(`<span style="color:#8EC489">❯</span> <span style="color:#E8EBE4">${cmd}</span>`)
        runCommand(cmd)
        input.value = ""
    }
})

function runCommand(cmd) {
    switch(cmd.toLowerCase()) {
        case "help": 
            printLine([
                '<span style="color:#FFD84D">whoami</span>  — 자기소개',
                '<span style="color:#FFD84D">skills</span>  — 기술 스택',
                '<span style="color:#FFD84D">project</span> — 프로젝트 & 수상',
                '<span style="color:#FFD84D">contact</span> — 연락처',
                '<span style="color:#FFD84D">clear</span>   — 터미널 초기화',
            ])
            break

        case "whoami":
            printLine([
                '안녕하세요 서울디지텍고 2학년 3반 <span style="color:#8EC489">박시후</span>입니다.',
                '2009년 7월 14일생.',
                '기능반 활동을 통해 꾸준히 역량을 키우고 있습니다.',
                '프론트엔드 개발자, 혹은 풀스택 개발자를 목표로 두고 있으며',
                '꿈은 세상의 모든 애니메이션 시청입니다. 😄',
            ])
            break

        case "skills":
            printLine([
                '── Frontend ──',
                '  <span style="color:#8EC489">●</span> HTML / CSS',
                '  <span style="color:#8EC489">●</span> JavaScript',
                '  <span style="color:#8EC489">●</span> React',
                '── Backend ──',
                '  <span style="color:#8EC489">●</span> PHP',
                '  <span style="color:#8EC489">●</span> MySQL',
                '  <span style="color:#8EC489">●</span> Node.js',
            ])
            break
        
        case "project":
            printLine([
                '── 자격증 ──',
                '  🏅 웹디자인기능사',
                '  🏅 ITQ 엑셀 / 한글',
                '── 수상 ──',
                '  🏆 2025 해커톤 동상',
                '  🏆 2025 웹&앱 경진대회 장려상',
                '  🏆 2025 포트폴리오 경진대회 장려상',
                '── 활동 ──',
                '  🚀 현대 제로원(ZER01NE) 참여',
            ])
            break

        case "contact":
            printLine([
                '  💻 GitHub: <span style="color:#8EC489">@sihuxx</span>',
                '  📸 Instagram: <span style="color:#8EC489">@si_ihhu</span>',
                '  ✉️  Gmail: <span style="color:#8EC489">sihu714@gmail.com</span>',
            ])
            break

        case "clear":
            output.innerHTML = ""
            i = 0
            boot()
            break

        default: 
            printLine([`<span style="color:#ECA9A9">${cmd}: command not found.</span> Try <span style="color:#FFD84D">help</span>`])
            break
    }
}

window.addEventListener("DOMContentLoaded", () => {
    input.focus()
})

// Add CSS for line animation
const style = document.createElement('style')
style.textContent = `@keyframes fadeInLine { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }`
document.head.appendChild(style)