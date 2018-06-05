const buildsUrl = 'https://vscode.visualstudio.com/VSCode/_apis/build/Builds?definitions=1&statusFilter=2&$top=25&branchName=refs/heads/master';
const compareCommitsUrl = (base, head) => `https://api.github.com/repos/Microsoft/vscode/compare/${base}...${head}`;

async function getBuildStatus() {
  const buildsRes = await fetch(buildsUrl);
  const buildsResJson = await buildsRes.json();
  let builds = buildsResJson.value;

  // builds = builds.slice(13);

  if (builds.length === 0) {
    throw new Error('No builds found');
  }

  const url = `https://vscode.visualstudio.com/VSCode/_build/index?buildId=${builds[0].id}&_a=summary`;

  if (builds[0].result === 'succeeded') {
    return { green: true, url };
  }

  const lastSuccessIndex = builds.findIndex(b => b.result === 'succeeded');

  if (lastSuccessIndex === -1) {
    return { green: false, url };
  }

  const firstFailIndex = lastSuccessIndex - 1;
  const lastSuccess = builds[lastSuccessIndex];
  const firstFail = builds[firstFailIndex];

  console.log('Last successful commit:', lastSuccess.sourceVersion);
  console.log('First failed commit:', firstFail.sourceVersion);

  const compareRes = await fetch(compareCommitsUrl(lastSuccess.sourceVersion, firstFail.sourceVersion));
  const compareResJson = await compareRes.json();
  const commits = compareResJson.commits.map(c => ({
    sha: c.sha,
    url: c.html_url,
    message: c.commit.message.replace(/\n.*$/, ''),
    author: c.author.login,
    authorUrl: c.author.html_url,
    avatarUrl: c.author.avatar_url,
  }));

  return { green: false, commits, url };
}

async function main() {
  const status = await getBuildStatus();
  const container = document.getElementById('main');
  const header = document.createElement('header');
  container.appendChild(header);

  const headerLink = document.createElement('a');
  headerLink.href = status.url;
  headerLink.target = '_blank';
  header.appendChild(headerLink);

  if (status.green) {
    header.className = 'green';
    headerLink.textContent = 'Build is green';
    return;
  }

  header.className = 'red';
  headerLink.textContent = 'Build is broken';

  const commits = document.createElement('div');
  commits.className = 'commits';
  container.appendChild(commits);

  const message = document.createElement('p');
  message.className = 'message';
  message.innerText = 'Potential first commits to break the build:';
  commits.appendChild(message);

  for (const commit of status.commits) {
    const el = document.createElement('div');
    el.className = 'commit';

    const author = document.createElement('a');
    author.className = 'author';
    author.href = commit.authorUrl;
    author.target = '_blank';

    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.height = 20;
    avatar.width = 20;
    avatar.alt = `@${commit.author}`;
    avatar.src = commit.avatarUrl;
    author.appendChild(avatar);

    const name = document.createElement('span');
    name.className = 'name';
    name.innerText = commit.author;
    author.appendChild(name);
    el.appendChild(author);

    const message = document.createElement('a');
    message.className = 'message';
    message.innerText = commit.message;
    message.href = commit.url;
    message.target = '_blank';
    el.appendChild(message);

    commits.appendChild(el);
  }
}

main().catch(err => console.error(err));

