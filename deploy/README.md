# Деплой ветки на dev-стенд site_form

CI-деплой на **dev.likey.su** (ветку feature/fix/dev). Прод (likey.su) этим механизмом **не** затрагивается —
там деплой остаётся ручным (docs/likey/likey-infra.md).

В отличие от likey-site, релиз **не собирается в CI**: боевой webpack-конфиг лежит уровнем выше репозитория
на сервере, поэтому CI только триггерит сборку на сервере от пользователя bitrix (тот же штатный
'npm run build', без sudo/root).

## Что где (на сервере likey.su)

| Путь | Откуда | Зачем |
|---|---|---|
| /var/lib/form-deploy/ | setup.sh | домашний каталог CI-юзера (shell /bin/bash — нужен для forced command) |
| /var/lib/form-deploy/.ssh/authorized_keys | setup.sh + deploy/ssh/form-deploy.pub | restrict-ключ CI |
| /usr/local/sbin/form-deploy-gate | server/form-deploy-gate | forced command: 'form-deploy build <branch>' или 'form-deploy release' |
| /usr/local/sbin/form-deploy | server/form-deploy | root-обёртка: валидирует ветку и запускает сборку от bitrix |
| /etc/sudoers.d/form-deploy | sudoers/form-deploy | sudo только на /usr/local/sbin/form-deploy |
| …/aspro-allcorp2/build-branch.sh | server/build-branch.sh | (от bitrix) лок → бэкап бандла → git fetch/checkout/pull → npm run build → проверка |

## Первичная настройка (один раз, делает администратор)

Шаг 0 — залить deploy/ во временную папку:

    tar -czf - deploy | ssh -o BatchMode=yes likey.su 'rm -rf /tmp/site-form-deploy && mkdir /tmp/site-form-deploy && tar --no-same-owner -xzf - -C /tmp/site-form-deploy'

Шаг 1 — ключ CI (локально): приватную часть — только в секрет GitHub:

    ssh-keygen -t ed25519 -N '' -C form-deploy-ci -f ~/.ssh/form_deploy_ci
    cp ~/.ssh/form_deploy_ci.pub deploy/ssh/form-deploy.pub
    gh secret set DEPLOY_SSH_KEY < ~/.ssh/form_deploy_ci
    ssh-keyscan -t ed25519 likey.su | gh secret set DEPLOY_KNOWN_HOSTS
    gh variable set DEPLOY_HOST --body likey.su

Шаг 2 — на сервере (root): создать юзера, поставить скрипты, sudoers, ключ:

    ssh -o BatchMode=yes likey.su 'bash /tmp/site-form-deploy/deploy/server/setup.sh'

Проверка: id form-deploy; sudo visudo -c; cat /var/lib/form-deploy/.ssh/authorized_keys.

## Проверка ключа

Команда вне списка — отказ:

    ssh -i ~/.ssh/form_deploy_ci form-deploy@likey.su id
    # → only 'form-deploy build <branch>' or 'form-deploy release' is allowed

Валидная выкладка:

    ssh -i ~/.ssh/form_deploy_ci form-deploy@likey.su 'form-deploy build feature/example'

Освободить стенд:

    ssh -i ~/.ssh/form_deploy_ci form-deploy@likey.su 'form-deploy release'

## Лок стенда

Каждая выкладка занимает стенд (.dev-stand-lock, держится <3 ч). Пока лок свежий и принадлежит
другой ветке, следующая выкладка падает с «dev-stand is locked by '<ветка>' (<3h)». Освободить:

    ssh -i ~/.ssh/form_deploy_ci form-deploy@likey.su 'form-deploy release'

или вручную с сервера: rm -f /home/bitrix/ext_www/dev.likey.su/local/templates/aspro-allcorp2/.dev-stand-lock.

## Откат

- Бандл: build-branch.sh перед сборкой кладёт assets/js/application.js.<TS>.bak и assets/css/application.css.<TS>.bak;
  вернуть — cp assets/js/application.js.<TS>.bak assets/js/application.js.
- Доступ CI отозвать: ssh likey.su 'rm /var/lib/form-deploy/.ssh/authorized_keys; pkill -u form-deploy' + gh secret delete DEPLOY_SSH_KEY.
- Полностью убрать: userdel -r form-deploy, удалить /usr/local/sbin/form-deploy-gate и /usr/local/sbin/form-deploy,
  /etc/sudoers.d/form-deploy, build-branch.sh.

## Журнал вызовов

    ssh likey.su 'journalctl -t form-deploy-gate'

(gate логирует каждую команду и отказы).

## Смоук

dev.likey.su снаружи отдаёт 403, поэтому смоук в workflow — только на сервере: build exit 0 +
sha256 бандла до/после сборки должен измениться (иначе — ошибка). Живую проверку с реальной 1С делает человек
со своего IP/VPN (docs/likey/likey-infra.md).
